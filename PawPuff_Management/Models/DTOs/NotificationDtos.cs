using System.ComponentModel.DataAnnotations;

namespace PawPuff_Management.Models.DTOs
{
	public static class NotificationRecipientTypes
	{
		public const string User = "user";

		public const string Admin = "admin";
	}

	public class NotificationAccountOptionDto
	{
		public int Id { get; set; }

		public string Account { get; set; } = string.Empty;
	}

	public class CreateAdminNotificationDto
	{
		[Required(ErrorMessage = "請選擇訊息傳送對象。")]
		[RegularExpression(
			"^(user|admin)$",
			ErrorMessage = "訊息傳送對象格式不正確。")]
		public string RecipientType { get; set; } = string.Empty;

		[Required(ErrorMessage = "請輸入收件者帳號。")]
		[StringLength(50, ErrorMessage = "帳號不可超過 50 個字。")]
		public string RecipientAccount { get; set; } = string.Empty;

		[Required(ErrorMessage = "請輸入通知內容。")]
		[StringLength(100, ErrorMessage = "通知內容不可超過 100 個字。")]
		public string NotificationContent { get; set; } = string.Empty;
	}

	public class NotificationCreateRecordDto
	{
		public int? UserId { get; set; }

		public int? AdminId { get; set; }

		public string Type { get; set; } = string.Empty;

		public string NotificationContent { get; set; } = string.Empty;

		public bool IsRead { get; set; }

		public string? LinkUrl { get; set; }

		public DateTime CreatedAt { get; set; }

		public int SenderAdminId { get; set; }
	}

	public class NotificationDto
	{
		public int Id { get; set; }

		public int? UserId { get; set; }

		public int? AdminId { get; set; }

		public string Type { get; set; } = string.Empty;

		public string NotificationContent { get; set; } = string.Empty;

		public bool IsRead { get; set; }

		public string? LinkUrl { get; set; }

		public DateTime CreatedAt { get; set; }

		public int? SenderAdminId { get; set; }
	}

	public class AdminNotificationListItemDto
	{
		public int Id { get; set; }

		public string Type { get; set; } = string.Empty;

		public string NotificationContent { get; set; } = string.Empty;

		public bool IsRead { get; set; }

		public string? LinkUrl { get; set; }

		public DateTime CreatedAt { get; set; }

		public int? SenderAdminId { get; set; }

		public string? SenderAdminNickname { get; set; }

		public string? SenderAdminAccount { get; set; }
	}

	public class MarkNotificationReadDto
	{
		[Range(1, int.MaxValue, ErrorMessage = "通知編號不正確。")]
		public int NotificationId { get; set; }
	}

	public enum NotificationSendStatus
	{
		Success,
		ValidationFailed,
		RecipientNotFound,
		SenderAdminNotFound,
		PersistenceFailed
	}

	public class NotificationSendResultDto
	{
		public NotificationSendStatus Status { get; set; }

		public string Message { get; set; } = string.Empty;

		public NotificationDto? Notification { get; set; }
	}

	public enum NotificationReadStatus
	{
		Success,
		ValidationFailed,
		NotificationNotFound
	}

	public class NotificationReadResultDto
	{
		public NotificationReadStatus Status { get; set; }

		public string Message { get; set; } = string.Empty;

		public int UnreadCount { get; set; }
	}
}
