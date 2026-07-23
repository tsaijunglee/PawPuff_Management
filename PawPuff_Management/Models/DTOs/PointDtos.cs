using System.ComponentModel.DataAnnotations;

namespace PawPuff_Management.Models.DTOs
{
	public class PointTransactionDto
	{
		public int Id { get; set; }

		public int UserId { get; set; }

		public string UserAccount { get; set; } = string.Empty;

		public int ChangeTypeId { get; set; }

		public string ActionName { get; set; } = string.Empty;

		public int PointChange { get; set; }

		public int BalanceAfter { get; set; }

		public string Description { get; set; } = string.Empty;

		public DateTime CreatedAt { get; set; }

		public int? ModifiedByAdminId { get; set; }

		public string? ModifiedByAdminAccount { get; set; }

		public int? UserProductId { get; set; }
	}

	public class PointChangeTypeOptionDto
	{
		public int Id { get; set; }

		public string ActionName { get; set; } = string.Empty;
	}

	public class UserAccountOptionDto
	{
		public int Id { get; set; }

		public string Account { get; set; } = string.Empty;

		public int PointBalance { get; set; }
	}

	public class CreatePointTransactionDto
	{
		[Required(ErrorMessage = "請輸入會員帳號。")]
		[StringLength(50, ErrorMessage = "帳號不可超過 50 個字。")]
		public string UserAccount { get; set; } = string.Empty;

		[Required(ErrorMessage = "請輸入點數變化。")]
		public int? PointChange { get; set; }

		[Required(ErrorMessage = "請輸入描述。")]
		[StringLength(100, ErrorMessage = "描述不可超過 100 個字。")]
		public string Description { get; set; } = string.Empty;
	}

	public enum PointTransactionCreateStatus
	{
		Success,
		ValidationFailed,
		UserNotFound,
		ChangeTypeNotFound,
		AdminNotFound,
		InsufficientBalance,
		BalanceOverflow,
		PersistenceFailed
	}

	public class PointTransactionCreateResultDto
	{
		public PointTransactionCreateStatus Status { get; set; }

		public string Message { get; set; } = string.Empty;

		public PointTransactionDto? Transaction { get; set; }
	}
}
