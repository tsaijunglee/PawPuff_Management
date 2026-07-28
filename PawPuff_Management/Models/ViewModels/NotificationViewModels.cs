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
}
