namespace PawPuff_Management.Models.ViewModels
{
	public class PointsIndexViewModel
	{
		public List<PointTransactionItemViewModel> Transactions { get; set; } = new();

		public List<PointChangeTypeOptionViewModel> ChangeTypes { get; set; } = new();

		public List<UserAccountOptionViewModel> UserAccounts { get; set; } = new();

		public int TotalCount => Transactions.Count;
	}

	public class PointTransactionItemViewModel
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

		public string CreatedAtDisplay => CreatedAt.ToString("yyyy-MM-dd HH:mm");
	}

	public class PointChangeTypeOptionViewModel
	{
		public int Id { get; set; }

		public string ActionName { get; set; } = string.Empty;
	}

	public class UserAccountOptionViewModel
	{
		public int Id { get; set; }

		public string Account { get; set; } = string.Empty;

		public int PointBalance { get; set; }
	}
}
