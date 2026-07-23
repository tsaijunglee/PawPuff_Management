using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace PawPuff_Management.Models.DTOs
{
	public class LoginDto
	{

		[Required(ErrorMessage = "請輸入帳號")]
		[DisplayName("帳號")]
		public string Account { get; set; } = string.Empty;



		[Required(ErrorMessage = "請輸入密碼")]
		[DisplayName("密碼")]
		public string Password { get; set; } = string.Empty;

	}

}
