using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.EfModels;
using PawPuff_Management.Models.Infra;
using PawPuff_Management.Models.Repositories;

namespace PawPuff_Management.Models.Services
{
	public class UserService
	{
		private readonly UserRepository _repository;

		public UserService(UserRepository repository)
		{
			_repository = repository;
		}


		//查詢會員列表
		public async Task<List<CreateUserDto>> GetAllAsync()
		{
			var users = await _repository.GetAllAsync();

			return users.Select(user => new CreateUserDto
			{
				Id = user.Id,
				Account = user.Account,
				PasswordHash = "********",
				Nickname = user.Nickname,
				Email = user.Email,
				Phone = user.Phone,
				ActiveDollConfigsId =
					user.ActiveDollConfigsId,
				ActiveDollFrameId =
					user.ActiveDollFrameId,
				PointBalance = user.PointBalance,
				IsActive = user.IsActive,
				CreatedAt = user.CreatedAt,
				AdminComment = user.AdminComment,
				AdminUpdatedAt = user.AdminUpdatedAt,
				ModifiedByAdminId = user.ModifiedByAdminId
			}).ToList();
		}








		//會員停用啟用
		public async Task<(bool IsSuccess, string Message)>
		   UpdateStatusAsync(
			   UpdateUserStatusDto request,
			   int operatorAdminId)
		{
			if (request.UserId <= 0)
				return (false, "會員編號不正確。");

			// 停用時必須填寫原因
			if (!request.IsActive &&
				string.IsNullOrWhiteSpace(request.AdminComment))
			{
				return (
					false,
					"停用會員時必須輸入原因。"
				);
			}

			var user = await _repository.GetByIdAsync(request.UserId);

			if (user is null)
				return (false, "找不到指定會員。");

			if (user.IsActive == request.IsActive)
				return (true, "會員狀態沒有變更。");

			user.IsActive = request.IsActive;

			// 重新啟用時清除舊的停用原因
			user.AdminComment = request.IsActive
				? null
				: request.AdminComment!.Trim();

			user.AdminUpdatedAt = DateTime.Now;
			user.ModifiedByAdminId = operatorAdminId;

			await _repository.SaveChangesAsync();

			return (
				true,
				request.IsActive
					? "會員帳號已啟用。"
					: "會員帳號已停用。"
			);
		}


		public async Task<
	(bool IsSuccess, string Message, User? User)>
	CreateUserAsync(CreateUserDto request)
		{
			var account = request.Account.Trim();
			var nickname = request.Nickname.Trim();
			var email = request.Email.Trim().ToLower();
			var phone = request.Phone.Trim();

			if (await _repository
				.AccountExistsAsync(account))
			{
				return (
					false,
					"此會員帳號已存在。",
					null
				);
			}

			if (await _repository
				.EmailExistsAsync(email))
			{
				return (
					false,
					"此電子信箱已被使用。",
					null
				);
			}

			if (await _repository
				.PhoneExistsAsync(phone))
			{
				return (
					false,
					"此手機號碼已被使用。",
					null
				);
			}

			var user = new User
			{
				Account = account,
				PasswordHash =HashUtility.HashPassword(request.Password),
				Nickname = nickname,
				Email = email,
				Phone = phone,

				ActiveDollConfigsId = null,
				ActiveDollFrameId = null,
				PointBalance = 0,

				IsActive = true,
				CreatedAt = DateTime.Now,

				AdminComment = null,
				AdminUpdatedAt = null,
				ModifiedByAdminId = null
			};

			_repository.AddUser(user);
			await _repository.SaveChangesAsync();

			return (
				true,
				"會員新增成功。",
				user
			);
		}

	}
}

