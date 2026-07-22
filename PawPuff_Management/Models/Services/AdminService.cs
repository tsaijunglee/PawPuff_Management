using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.EfModels;
using PawPuff_Management.Models.Repositories;
using System.Security.Cryptography.Xml;
using static Amazon.S3.Util.S3EventNotification;

namespace PawPuff_Management.Models.Services
{

	/// <summary>
	/// 負責：
	///	1.呼叫 AdminRepository 取得資料。
	///  2.將 Admin Entity 轉成 AdminPermissionDto。
	///  3.驗證前端送來的權限。
	///  4.比較哪些權限需要新增或刪除。
	///  5.最後要求 Repository 儲存。
	/// </summary>
	public class AdminService
	{
		private readonly AdminRepository _repository;
		private readonly IPasswordHasher<Admin> _passwordHasher;

		public AdminService(AdminRepository repository,IPasswordHasher<Admin> passwordHasher)
		{
			_repository = repository; _passwordHasher = passwordHasher;
		}

		// 資料庫允許儲存的權限英文名稱
		private static readonly string[] AllowedPermissions =
		[
		"Dashboard",
		"Account",
		"Articles",
		"Shop",
		"Points",
		"Doll",
		"Notification",
		"Support"
		];

		/// <summary>
		/// 對應AdminRepository:取得所有管理員及其權限，並轉成 DTO
		/// 
		/// </summary>
		public async Task<List<AdminPermissionDto>> GetAdminsWithPermissionsAsync()
		{
			var admins = await _repository.GetAdminsWithPermissionsAsync(); // Repository 從資料庫取得 Admin Entity: Models/EfModels/Admin.cs


			return admins.Select(admin => new AdminPermissionDto
			{

				AdminId = admin.Id,
				Account = admin.Account,
				PasswordHash = string.IsNullOrWhiteSpace(admin.PasswordHash) ? "未設定" : "********",
				Nickname = admin.Nickname,
				Email = admin.Email,
				IsActive = admin.IsActive,
				CreatedAt = admin.CreatedAt,
				AdminComment = admin.AdminComment,
				AdminUpdatedAt = admin.AdminUpdatedAt,
				ModifiedByAdminId = admin.ModifiedByAdminId,


				Permissions = admin.AdminsPermissions 
				.Select(permission => permission.PermissionName) 
				.ToList()

				///
				///[
				///	 new AdminPermission { PermissionName = "新增" },
				///	 new AdminPermission { PermissionName = "編輯" },
				///	 new AdminPermission { PermissionName = "刪除" }
				///]
				///
				/// .Select(....) => 
				/// 依序執行：
				/// 第一個物件 → 取出 "新增"
				/// 第二個物件 → 取出 "編輯"
				/// 第三個物件 → 取出 "刪除"
				/// 
				///.ToList() =>
				///List<string> Permissions = ["新增", "編輯", "刪除"];
				///

			})
				.ToList();
		}


		///
		///是 Service 的商業操作，裡面會組合呼叫多個 Repository 方法
		///
		///驗證並儲存管理員權限
		///

		///
		///
		///AdminsController
		///    ↓
		///AdminService.SavePermissionsAsync()
		///    ↓
		///AdminRepository.AdminExistsAsync()
		///AdminRepository.GetPermissionsByAdminIdAsync()
		///AdminRepository.AddPermission()
		///AdminRepository.RemovePermissions()
		///AdminRepository.SaveChangesAsync()
		///
		public async Task<(bool IsSuccess, string Message)> //會回傳是否成功 => 成功失敗各有其Message
	    SavePermissionsAsync(SaveAdminPermissionsRequestDto request)//傳入request Ex: "admins":[ {"adminId": 1,  "permissions": [ "Dashboard","Account"]}]
		{
			//驗證資料是否為空
			//null 或 Admin table 空清單 => return false, "沒有需要儲存的管理員權限資料。"
			if (request?.Admins is null ||
				request.Admins.Count == 0)
			{
				return (false, "沒有需要儲存的管理員權限資料。");
			}



			///驗證:同一次儲存請求裡，有沒有同一位管理員出現兩次以上？
			///
			///request.Admins :取得Admin table 
			///.GroupBy() : 依照AdminId分組 
			///FirstOrDefault():取得第一個重複群組 =>條件:group.Count()>1
			var duplicatedAdmin = request.Admins
				.GroupBy(admin => admin.AdminId)
				.FirstOrDefault(group => group.Count() > 1);

			///duplicatedAdmin == null => 沒有重複管理員
			///duplicatedAdmin is not null => 重複權限管理員
			if (duplicatedAdmin is not null)
			{
				return (
					false,
					$"管理員編號 {duplicatedAdmin.Key} 出現重複資料。"
				);
			}





			// 保存驗證及正規化後的權限
			var desiredPermissionsByAdmin =
				new Dictionary<int, HashSet<string>>();
			foreach (var adminUpdate in request.Admins)
			{
				if (adminUpdate.AdminId <= 0)
				{
					return (
						false,
						$"管理員編號 {adminUpdate.AdminId} 不正確。"
					);
				}

				var desiredPermissions =
					new HashSet<string>(
						StringComparer.OrdinalIgnoreCase);

				foreach (var rawPermission
					in adminUpdate.Permissions ?? [])
				{
					// 將 dashboard、DASHBOARD 等值
					// 正規化成 Dashboard。
					var canonicalPermission =
						AllowedPermissions.FirstOrDefault(
							allowedPermission =>
								string.Equals(
									allowedPermission,
									rawPermission?.Trim(),
									StringComparison
										.OrdinalIgnoreCase));

					if (canonicalPermission is null)
					{
						return (
							false,
							$"不允許的權限名稱：{rawPermission}"
						);
					}

					desiredPermissions.Add(
						canonicalPermission);
				}

				desiredPermissionsByAdmin.Add(
					adminUpdate.AdminId,
					desiredPermissions);
			}

			// 先確認所有管理員都存在。
			foreach (var adminId
				in desiredPermissionsByAdmin.Keys)
			{
				var adminExists =
					await _repository
						.AdminExistsAsync(adminId);

				if (!adminExists)
				{
					return (
						false,
						$"找不到管理員編號 {adminId}。"
					);
				}
			}

			// 比較每位管理員的新舊權限。
			foreach (var adminPermissions
				in desiredPermissionsByAdmin)
			{
				var adminId = adminPermissions.Key;
				var desiredPermissions =
					adminPermissions.Value;

				// 從資料庫取得目前權限。
				var currentPermissions =
					await _repository
						.GetPermissionsByAdminIdAsync(
							adminId);

				// 找出被取消勾選的權限。
				var permissionsToRemove =
					currentPermissions
						.Where(currentPermission =>
							!desiredPermissions.Contains(
								currentPermission
									.PermissionName))
						.ToList();

				_repository.RemovePermissions(
					permissionsToRemove);

				// 目前資料庫已有的權限名稱。
				var currentPermissionNames =
					currentPermissions
						.Select(permission =>
							permission.PermissionName)
						.ToHashSet(
							StringComparer.OrdinalIgnoreCase);

				// 找出新勾選的權限。
				var permissionsToAdd =
					desiredPermissions
						.Where(permissionName =>
							!currentPermissionNames.Contains(
								permissionName));

				foreach (var permissionName
					in permissionsToAdd)
				{
					_repository.AddPermission(
						new AdminsPermission
						{
							AdminsId = adminId,
							PermissionName =
								permissionName
						});
				}
			}

			// 所有新增、刪除都準備完成後，
			// 一次寫入資料庫。
			await _repository.SaveChangesAsync();

			return (
				true,
				"管理員權限已成功儲存。"
			);
		}


		// 處理新增管理員:1.帳號重複檢查 2.Email 重複檢查 
		public async Task<(bool IsSuccess,string Message,Admin? Admin)>
	CreateAdminAsync(CreateAdminDto request)
		{
			var account = request.Account.Trim();
			var email = request.Email.Trim().ToLower();
			var nickname = request.Nickname.Trim();

			if (await _repository.AccountExistsAsync(request.Account))
			{
				return (
	false,
	"此管理員帳號已存在。",
	null
);
			}

			if (await _repository.EmailExistsAsync(request.Email))
			{
				return (
	false,
	"此管理員帳號已存在。",
	null
);
			}

			var admin = new Admin
			{
				Account = account,
				Nickname = nickname,
				Email = email,
				IsActive = true,
				CreatedAt = DateTime.Now
			};

			admin.PasswordHash =
				_passwordHasher.HashPassword(
					admin,
					request.Password);

			_repository.AddAdmin(admin);
			await _repository.SaveChangesAsync();


			// 接下來才建立 Admin、雜湊密碼及寫入資料庫。

			return (
	true,
	"管理員新增成功。",
	admin
);
		}
	}


}
	

