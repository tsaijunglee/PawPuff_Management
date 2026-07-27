using System.ComponentModel.DataAnnotations;

namespace PawPuff_Management.Models.DTOs
{
	public class UpdateAdminStatusDto
	{
		
			public int AdminId { get; set; } //管理員ID

			public bool IsActive { get; set; }//啟用停用狀態



		[StringLength(500, ErrorMessage = "說明不能超過 500 個字。")]
		public string? AdminComment { get; set; } //停用原因


	}
}
