using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.Repositories;
using PawPuff_Management.Models.ViewModels;

namespace PawPuff_Management.Models.Services
{
	public interface IPointRuleService
	{
		Task<PointRulesIndexViewModel> GetIndexViewModelAsync(
			CancellationToken cancellationToken = default);

		Task<PointRuleUpdateResultDto> UpdateAsync(
			UpdatePointRuleDto request,
			CancellationToken cancellationToken = default);
	}

	public class PointRuleService : IPointRuleService
	{
		private readonly IPointRuleRepository _repository;

		public PointRuleService(IPointRuleRepository repository)
		{
			_repository = repository;
		}

		public async Task<PointRulesIndexViewModel> GetIndexViewModelAsync(
			CancellationToken cancellationToken = default)
		{
			var rules = await _repository.GetAllAsync(cancellationToken);

			return new PointRulesIndexViewModel
			{
				Rules = rules
					.Select(rule => new PointRuleItemViewModel
					{
						Id = rule.Id,
						ActionName = rule.ActionName,
						IsFixed = rule.IsFixed,
						DefaultValue = rule.DefaultValue,
						DailyLimit = rule.DailyLimit,
						Description = rule.Description
					})
					.ToList()
			};
		}

		public async Task<PointRuleUpdateResultDto> UpdateAsync(
			UpdatePointRuleDto request,
			CancellationToken cancellationToken = default)
		{
			var description = (request.Description ?? string.Empty).Trim();

			if (request.Id <= 0)
			{
				return CreateResult(
					PointRuleUpdateStatus.ValidationFailed,
					"規則編號不正確。");
			}

			if (!request.DefaultValue.HasValue)
			{
				return CreateResult(
					PointRuleUpdateStatus.ValidationFailed,
					"請輸入預設值。");
			}

			var defaultValue = request.DefaultValue.Value;

			if (defaultValue < 0)
			{
				return CreateResult(
					PointRuleUpdateStatus.ValidationFailed,
					"預設值不可小於 0。");
			}

			if (string.IsNullOrWhiteSpace(description))
			{
				return CreateResult(
					PointRuleUpdateStatus.ValidationFailed,
					"請填寫描述。");
			}

			if (description.Length > 100)
			{
				return CreateResult(
					PointRuleUpdateStatus.ValidationFailed,
					"描述不可超過 100 個字。");
			}

			var existingRule = await _repository.GetByIdAsync(
				request.Id,
				cancellationToken);

			if (existingRule is null)
			{
				return CreateResult(
					PointRuleUpdateStatus.NotFound,
					"找不到指定的點數規則。");
			}

			if (!existingRule.IsFixed)
			{
				return CreateResult(
					PointRuleUpdateStatus.NotEditable,
					"此規則不是固定值，無法編輯預設值與描述。");
			}

			if (existingRule.DefaultValue == defaultValue &&
				string.Equals(
					existingRule.Description,
					description,
					StringComparison.Ordinal))
			{
				return new PointRuleUpdateResultDto
				{
					Status = PointRuleUpdateStatus.Success,
					Message = "預設值與描述未變更。",
					Rule = existingRule
				};
			}

			var updatedRule = await _repository.UpdateFixedRuleAsync(
				request.Id,
				defaultValue,
				description,
				cancellationToken);

			if (updatedRule is null)
			{
				return CreateResult(
					PointRuleUpdateStatus.UpdateConflict,
					"規則狀態已變更，請重新整理頁面後再試一次。");
			}

			return new PointRuleUpdateResultDto
			{
				Status = PointRuleUpdateStatus.Success,
				Message = $"{updatedRule.ActionName}已更新。",
				Rule = updatedRule
			};
		}

		private static PointRuleUpdateResultDto CreateResult(
			PointRuleUpdateStatus status,
			string message)
		{
			return new PointRuleUpdateResultDto
			{
				Status = status,
				Message = message
			};
		}
	}
}
