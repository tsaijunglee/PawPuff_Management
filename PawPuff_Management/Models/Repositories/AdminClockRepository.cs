using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management.Models.Repositories
{
	public class AdminClockRepository
	{
		private readonly PawPuffContext _context;
		public AdminClockRepository(PawPuffContext context)
		{
			_context = context;
		}


		// 查詢某位管理員今天的打卡紀錄。
		// 不使用 AsNoTracking，因為下班打卡時需要修改。
		//依管理員查詢且同時依日期查詢
		//DateOnly : 代表要查詢哪一天的工作日期
		public async Task<AdminsClock?> GetByAdminAndDateAsync(int adminId,DateOnly workDate)
		{
			return await _context.AdminsClocks
				.FirstOrDefaultAsync(clock => clock.AdminsId == adminId && clock.WorkDate == workDate);
		}



		// 取得目前登入管理員的打卡紀錄。
		public async Task<List<AdminsClock>> GetByAdminIdAsync(int adminId)
		{
			return await _context.AdminsClocks
				.AsNoTracking()
				.Where(clock => clock.AdminsId == adminId) //取得目前adminId
				.OrderByDescending(clock => clock.WorkDate)//Primary Sort :workdate 由近到遠排列
				.ThenByDescending(clock => clock.ClockInTime) //Secondary Sort :上班打卡由近到遠
				.ToListAsync(); //列出清單
		}


		// 新增 AdminsClock 打卡資料
		public void Add(AdminsClock clock)
		{
			_context.AdminsClocks.Add(clock);
		}



		//保存異動資料
		public async Task SaveChangesAsync()
		{
			await _context.SaveChangesAsync();
		}



		/// <summary>
		/// 取得所有管理員的打卡紀錄，
		/// 並載入管理員帳號
		/// </summary>
		public async Task<List<AdminsClock>> GetAllAsync()
		{
			return await _context.AdminsClocks
				.AsNoTracking()
				.Include(clock =>
					clock.Admins)
				.OrderByDescending(clock =>
					clock.WorkDate)
				.ThenByDescending(clock =>
					clock.ClockInTime)
				.ToListAsync();
		}


	}
}


