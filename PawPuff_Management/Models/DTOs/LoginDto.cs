using System.ComponentModel;

namespace PawPuff_Management.Models.DTOs
{
	public class LoginDto
	{
		[DisplayName("帳號")]
		public string Account { get; set; }


		[DisplayName("密碼")]
		public string Password { get; set; }
	}
}
