using System.ComponentModel.DataAnnotations;

namespace PawPuff_Management.Models.DTOs
{
	public class CreateAdminDto
	{
		[Required(ErrorMessage = "請輸入帳號。")]
		[StringLength(
			50,
			MinimumLength = 4,
			ErrorMessage = "帳號長度必須為4～50字。")]
		[RegularExpression(
			@"^[A-Za-z0-9_]+$",
			ErrorMessage = "帳號只能使用英文字母、數字或底線。")]
		public string Account { get; set; } = string.Empty;


		[Required(ErrorMessage = "請輸入密碼。")]
		[StringLength(
			20,
			MinimumLength = 6,
			ErrorMessage = "密碼長度必須為6～20個字元。")]
		public string Password { get; set; } = string.Empty;


		[Required(ErrorMessage = "請再次輸入密碼。")]
		[Compare(
			nameof(Password),
			ErrorMessage = "確認密碼需與密碼相同。")]
		public string PasswordConfirm { get; set; } = string.Empty;


		[Required(ErrorMessage = "請輸入暱稱。")]
		[StringLength(
			10,
			MinimumLength = 1,
			ErrorMessage = "暱稱長度必須為1～10字。")]
		[RegularExpression(
			@"^[\p{L}\p{N}]+$",
			ErrorMessage = "暱稱只能使用中文、英文字母或數字。")]
		public string Nickname { get; set; } = string.Empty;


		[Required(ErrorMessage = "請輸入電子信箱。")]
		[StringLength(
			100,
			ErrorMessage = "電子信箱不能超過100字。")]
		[EmailAddress(ErrorMessage = "電子信箱格式不正確。")]
		public string Email { get; set; } = string.Empty;
	}
}

