using System.ComponentModel.DataAnnotations;

namespace PawPuff_Management.Models.DTOs
{
	public class PointRuleDto
	{
		public int Id { get; set; }

		public string ActionName { get; set; } = string.Empty;

		public bool IsFixed { get; set; }

		public int? DefaultValue { get; set; }

		public int? DailyLimit { get; set; }

		public string Description { get; set; } = string.Empty;
	}

	public class UpdatePointRuleDto
	{
		[Range(1, int.MaxValue, ErrorMessage = "規則編號不正確。")]
		public int Id { get; set; }

		[Required(ErrorMessage = "請輸入預設值。")]
		[Range(0, int.MaxValue, ErrorMessage = "預設值不可小於 0。")]
		public int? DefaultValue { get; set; }

		[Required(ErrorMessage = "請填寫描述。")]
		[StringLength(100, ErrorMessage = "描述不可超過 100 個字。")]
		public string Description { get; set; } = string.Empty;
	}

	public enum PointRuleUpdateStatus
	{
		Success,
		NotFound,
		NotEditable,
		ValidationFailed,
		UpdateConflict
	}

	public class PointRuleUpdateResultDto
	{
		public PointRuleUpdateStatus Status { get; set; }

		public string Message { get; set; } = string.Empty;

		public PointRuleDto? Rule { get; set; }
	}
}
