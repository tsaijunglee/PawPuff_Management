namespace PawPuff_Management.Models.DTOs
{
	public class AdminClockDto
	{
		public int Id { get; set; }


		// 所有打卡紀錄頁面顯示的管理員帳號
		public string AdminAccount{get;set;} = string.Empty;


		public DateOnly WorkDate { get; set; }

		public DateTime ClockInTime { get; set; }

		public DateTime? ClockOutTime { get; set; }

		


	}
}
