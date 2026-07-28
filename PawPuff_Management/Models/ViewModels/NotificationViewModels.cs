namespace PawPuff_Management.Models.ViewModels
{
	public class NotificationsIndexViewModel
	{
		public List<NotificationAccountOptionViewModel> UserAccounts { get; set; }
			= new();

		public List<NotificationAccountOptionViewModel> AdminAccounts { get; set; }
			= new();
	}

	public class NotificationAccountOptionViewModel
	{
		public int Id { get; set; }

		public string Account { get; set; } = string.Empty;
	}

	public class AdminNotificationCenterViewModel
	{
		public List<AdminNotificationItemViewModel> Notifications { get; set; }
			= new();

		public int UnreadCount { get; set; }
	}

	public class AdminNotificationItemViewModel
	{
		public int Id { get; set; }

		public string Type { get; set; } = string.Empty;

		public string NotificationContent { get; set; } = string.Empty;

		public bool IsRead { get; set; }

		public string? LinkUrl { get; set; }

		public DateTime CreatedAt { get; set; }

		public string CreatedAtDisplay { get; set; } = string.Empty;

		public int? SenderAdminId { get; set; }

		public string? SenderAdminNickname { get; set; }

		public string? SenderAdminAccount { get; set; }

		public bool IsAdminSendMessage =>
			Type == "ADMIN_SEND_MESSAGE";

		public bool HasLink =>
			!string.IsNullOrWhiteSpace(LinkUrl);

		public string SenderDisplayName
		{
			get
			{
				var nickname = SenderAdminNickname?.Trim();
				var account = SenderAdminAccount?.Trim();

				if (!string.IsNullOrWhiteSpace(nickname) &&
					!string.IsNullOrWhiteSpace(account))
				{
					return $"{nickname}({account})";
				}

				if (!string.IsNullOrWhiteSpace(nickname))
				{
					return nickname;
				}

				if (!string.IsNullOrWhiteSpace(account))
				{
					return account;
				}

				return "未知管理員";
			}
		}
	}
}
