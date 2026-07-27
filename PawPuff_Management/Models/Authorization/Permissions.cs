namespace PawPuff_Management.Models.Authorization
{
	public static class Permissions
	{
		public const string Dashboard = "Dashboard";
		public const string Account = "Account";
		public const string Articles = "Articles";
		public const string Shop = "Shop";
		public const string Points = "Points";
		public const string Doll = "Doll";
		public const string Notification = "Notification";
		public const string Support = "Support";

		public static readonly string[] All =
		{
			Dashboard,
			Account,
			Articles,
			Shop,
			Points,
			Doll,
			Notification,
			Support
		};
	};
}
