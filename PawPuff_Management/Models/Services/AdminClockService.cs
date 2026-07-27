using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.EfModels;
using PawPuff_Management.Models.Repositories;

namespace PawPuff_Management.Models.Services
{
	public class AdminClockService
	{
		private readonly AdminClockRepository _repository;
		public AdminClockService (AdminClockRepository repository)
		{
			_repository = repository;
		}

		/// <summary>
		/// 取得指定管理員的所有打卡紀錄。
		/// </summary>
		public async Task<List<AdminClockDto>> GetRecordsAsync(int adminId)
		{
			var records =await _repository.GetByAdminIdAsync(adminId);

			return records
				.Select(record =>ToDto(record))
				.ToList();
		}



		/// <summary>
		/// 執行上班打卡。
		/// 同一位管理員同一天只能打一次上班卡。
		/// </summary>
		public async Task<( bool IsSuccess, string Message, AdminClockDto? Clock)> ClockInAsync(int adminId)
		{
			if (adminId <= 0)
			{
				return (
					false,
					"管理員編號不正確。",
					null
				);
			}

			// 使用後端伺服器時間。
			var now = DateTime.Now;

			// 只取得年月日。
			var workDate = DateOnly.FromDateTime(now);

			// 確認今天是否已經有打卡紀錄。
			var existing = await _repository
					.GetByAdminAndDateAsync( adminId, workDate);

			if (existing is not null)
			{
				return (
					false,
					"今天已經完成上班打卡。",
					ToDto(existing)
				);
			}

			var clock = new AdminsClock
			{
				AdminsId = adminId,
				WorkDate = workDate,
				ClockInTime = now,
				ClockOutTime = null
			};

			// 加入 EF Core。
			_repository.Add(clock);

			// 寫入資料庫。
			await _repository.SaveChangesAsync();

			return (
				true,
				"上班打卡成功。",
				ToDto(clock)
			);
		}


		/// <summary>
		/// 執行下班打卡。
		/// 必須先完成上班打卡，且不可重複打下班卡。
		/// </summary>
		public async Task<(bool IsSuccess,string Message,AdminClockDto? Clock)> ClockOutAsync(int adminId)
		{
			if (adminId <= 0)
			{
				return (
					false,
					"管理員編號不正確。",
					null
				);
			}

			// 使用後端伺服器時間。
			var now = DateTime.Now;

			var workDate =DateOnly.FromDateTime(now);

			// 查詢今天原本的打卡紀錄。
			var clock =await _repository
					.GetByAdminAndDateAsync(adminId,workDate);

			// 沒有今天的紀錄，代表尚未上班打卡。
			if (clock is null)
			{
				return (
					false,
					"請先完成上班打卡。",
					null
				);
			}

			// 已經有下班時間，不可重複打卡。
			if (clock.ClockOutTime.HasValue)
			{
				return (
					false,
					"今天已經完成下班打卡。",
					ToDto(clock)
				);
			}

			// 更新同一筆打卡紀錄。
			clock.ClockOutTime = now;

			// 因為 Repository 查詢時沒有使用
			// AsNoTracking，所以 EF Core 會自動偵測異動。
			await _repository.SaveChangesAsync();

			return (
				true,
				"下班打卡成功。",
				ToDto(clock)
			);
		}

		
		



		/// <summary>
		/// 取得所有管理員的打卡紀錄，
		/// 並載入管理員帳號
		/// </summary>
		/// <returns></returns>
		public async Task<List<AdminClockDto>>GetAllRecordsAsync()
		{
			var records = await _repository.GetAllAsync();

			return records
				.Select(record =>
					new AdminClockDto
					{
						Id = record.Id,

						AdminAccount =record.Admins.Account,

						WorkDate =record.WorkDate,

						ClockInTime =
			record.ClockInTime,

						ClockOutTime =
							record.ClockOutTime
					})
				.ToList();
		}




		/// <summary>
		/// 將 AdminsClock Entity 轉成 AdminClockDto。
		/// </summary>
		private static AdminClockDto ToDto(AdminsClock clock)
		{
			return new AdminClockDto
			{
				Id = clock.Id,

				AdminAccount = clock.Admins?.Account ?? string.Empty,

				WorkDate =clock.WorkDate,

				ClockInTime =clock.ClockInTime,

				ClockOutTime =clock.ClockOutTime
			};
		}






	}
}
