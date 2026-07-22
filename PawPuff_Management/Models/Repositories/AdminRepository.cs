using global::PawPuff_Management.Models.EfModels;
using Microsoft.EntityFrameworkCore;


namespace PawPuff_Management.Models.Repositories
{
	
	public class AdminRepository
	{
		private readonly PawPuffContext _context;

		public AdminRepository(PawPuffContext context)
		{
			_context = context;
		}


		/// <summary>
		/// 取得所有管理員以及每位管理員的權限
		/// </summary>
		/// 
		///從 admins 資料表取得所有管理員，同時取得每位管理員在 admins_permissions 裡的權限
		///
		///async Task<List<Admin>> :  async：這個方法會非同步查詢資料庫/Task：查詢需要等待/List<Admin>：查詢完成後，會得到管理員清單
		///
		///現在開始查詢
		///↓ 等待資料庫
	    ///查詢完成
		///	 ↓
		///得到 List<Admin>
		///
		public async Task<List<Admin>> GetAdminsWithPermissionsAsync()
		{
			return await _context.Admins //查詢資料庫的 admins 資料表
				.AsNoTracking()        //這批資料目前只拿來顯示，不準備直接修改
				.Include(admin => admin.AdminsPermissions) //adim 一位管理員擁有AdminsPermissions => 多筆權限
														   //AdminsPermissions: Admin.cs 裡面的「導覽屬性名稱」
				.OrderBy(admin => admin.Id)
				.ToListAsync(); //真正執行資料庫查詢，並把結果轉成：List<Admin>
		}


		//關聯性
		//admins.id
		//↑
		//admins_permissions.admins_id
		//
		//
		//.Include() 幫你完成關聯查詢 => 查詢 admins 時，再根據 admins.id = admins_permissions.admins_id，把每位管理員的權限資料一起載入


		//await =>  return await ...ToListAsync(); =>表示等待資料庫查詢完成，再把結果回傳給 Service



		/// <summary>
		/// 確認管理員是否存在
		/// </summary>
		/// 
		///
		///用來確認「指定的管理員編號是否真的存在於 admins 資料表」
		///
		///
		public async Task<bool> AdminExistsAsync(int adminId) //傳入adminId
		{
			return await _context.Admins //查詢資料庫的 admins 資料表
				.AnyAsync(admin => admin.Id == adminId);
		}
		///.AnyAsync() :是否至少有一筆資料符合條件？
		///條件是：admin.Id == adminId
		///
		/// 
		/// 
		/// 
		/// <summary>
		/// 取得指定管理員目前的所有權限
		/// </summary>
		public async Task<List<AdminsPermission>> GetPermissionsByAdminIdAsync(int adminId)
		{
			return await _context.AdminsPermissions//查詢資料庫的 AdminsPermissions 資料表
				.Where(permission => permission.AdminsId == adminId)
				.ToListAsync();//真正執行資料庫查詢，並把結果轉成：List<Admin>
		}


		/// <summary>
		/// 新增一筆管理員權限
		/// </summary>
		public void AddPermission(AdminsPermission permission)
		{
			_context.AdminsPermissions.Add(permission); // 此處尚未寫入資料庫
		}


		/// <summary>
		/// 刪除管理員權限
		/// </summary>
		/// 
		/// 
		///IEnumerable<AdminsPermission> 表示可以傳入多筆權限 Entity，例如：List<AdminsPermission> permissionsToRemove;
		///
		///RemoveRange():會把每一筆 Entity 的 EF 狀態標記為：Deleted => 此時資料庫內容仍然存在
		///
		public void RemovePermissions(IEnumerable<AdminsPermission> permissions)
		{
			_context.AdminsPermissions.RemoveRange(permissions);// 此處尚未刪除資料庫資料
		}


		/// <summary>
		/// 將異動儲存到資料庫
		/// </summary>
		public async Task SaveChangesAsync()
		{
			await _context.SaveChangesAsync(); //等待資料庫完成新增、修改或刪除，完成後程式才繼續往下執行
		}
		///所以 Service 必須這樣呼叫：await _repository.SaveChangesAsync(); =>不能漏掉 await




		public async Task<bool> AccountExistsAsync(string account)
		{
			var normalizedAccount = account.Trim().ToLower();

			return await _context.Admins.AnyAsync(admin =>
				admin.Account.ToLower() == normalizedAccount);
		}

		public async Task<bool> EmailExistsAsync(string email)
		{
			var normalizedEmail = email.Trim().ToLower();

			return await _context.Admins.AnyAsync(admin =>
				admin.Email.ToLower() == normalizedEmail);
		}

		public void AddAdmin(Admin admin)
		{
			_context.Admins.Add(admin);
		}



	}
}
