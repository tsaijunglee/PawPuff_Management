using System.ComponentModel.DataAnnotations;

namespace PawPuff_Management.Models.DTOs
{

	/// <summary>
	/// 顯示目前登入管理員的個人資料
	/// </summary>
	public class AdminProfileDto
	{
		public int AdminId { get; set; }

		public string Account { get; set; } = string.Empty;

		public string Nickname { get; set; } = string.Empty;

		public string Email { get; set; } = string.Empty;

		public DateTime CreatedAt { get; set; }

		public List<string> Permissions { get; set; } = [];
	}



	/// <summary>
	/// 接收目前登入管理員送出的修改資料。
	/// </summary>
	public class UpdateAdminProfileDto
	{
		[Required(ErrorMessage = "請輸入暱稱。")]
		[StringLength(10,ErrorMessage ="暱稱不可超過10個字。")]
		public string Nickname { get; set; }= string.Empty;

		// 不修改密碼時可以不傳
		[StringLength(20,MinimumLength = 6,
			ErrorMessage ="新密碼長度必須為6～20個字。")]
		public string? Password { get; set; }



		[Compare(nameof(Password),
			ErrorMessage ="兩次輸入的新密碼不一致。")]
		public string? PasswordConfirm
		{get;set;}

	}
}

