namespace PawPuff_Management.Models.ViewModels
{
	public class PointRulesIndexViewModel
	{
		public List<PointRuleItemViewModel> Rules { get; set; } = new();

		public int TotalCount => Rules.Count;
	}

	public class PointRuleItemViewModel
	{
		public int Id { get; set; }

		public string ActionName { get; set; } = string.Empty;

		public bool IsFixed { get; set; }

		public int? DefaultValue { get; set; }

		public int? DailyLimit { get; set; }

		public string Description { get; set; } = string.Empty;

		public bool CanEdit => IsFixed;
	}

}
