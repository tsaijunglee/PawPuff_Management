using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management.Models.Repositories
{
	public class UserRepository
	{
		private readonly PawPuffContext _context;

		public UserRepository(PawPuffContext context)
		{
			_context = context;
		}

		/// <summary>
		/// 取得所有會員，供會員列表使用。
		/// </summary>
		public async Task<List<User>> GetAllAsync()
		{
			return await _context.Users
				.AsNoTracking()
				.Include(user => user.ModifiedByAdmin)
				.OrderBy(user => user.Id)
				.ToListAsync();
		}



		/// <summary>
		/// 根據會員編號取得會員。
		/// 回傳被 EF Core 追蹤的 Entity，後續才能修改狀態。
		/// </summary>
		public async Task<User?> GetByIdAsync(int userId)
		{
			return await _context.Users
				.FirstOrDefaultAsync(user =>
					user.Id == userId);
		}





		//檢查帳號重複
		public async Task<bool> AccountExistsAsync(
	string account)
		{
			var normalizedAccount =
				account.Trim().ToLower();

			return await _context.Users.AnyAsync(user =>
				user.Account.ToLower() == normalizedAccount);
		}

		//檢查 Email 重複
		public async Task<bool> EmailExistsAsync(
	string email)
		{
			var normalizedEmail =
				email.Trim().ToLower();

			return await _context.Users.AnyAsync(user =>
				user.Email.ToLower() == normalizedEmail);
		}

		//檢查電話重複
		public async Task<bool> PhoneExistsAsync(
			string phone)
		{
			var normalizedPhone = phone.Trim();

			return await _context.Users.AnyAsync(user =>
				user.Phone == normalizedPhone);
		}

		//新增會員
		public void AddUser(User user)
		{
			_context.Users.Add(user);
		}


		/// <summary>
		/// 儲存會員資料異動。
		/// </summary>
		public async Task SaveChangesAsync()
		{
			await _context.SaveChangesAsync();
		}

	}
}
