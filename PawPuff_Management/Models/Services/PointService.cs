using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.Repositories;
using PawPuff_Management.Models.ViewModels;

namespace PawPuff_Management.Models.Services
{
	public interface IPointService
	{
		Task<PointsIndexViewModel> GetIndexViewModelAsync(
			CancellationToken cancellationToken = default);

		Task<PointTransactionCreateResultDto> CreateTransactionAsync(
			CreatePointTransactionDto request,
			int? adminId,
			CancellationToken cancellationToken = default);
	}

	public class PointService : IPointService
	{
		private const string GiveActionName = "管理員給予";
		private const string DeductActionName = "管理員扣除";
		private readonly IPointRepository _repository;

		public PointService(IPointRepository repository)
		{
			_repository = repository;
		}

		public async Task<PointsIndexViewModel> GetIndexViewModelAsync(
			CancellationToken cancellationToken = default)
		{
			// 同一個 scoped DbContext 不應平行執行多個查詢，所以依序 await。
			var transactionDtos = await _repository.GetTransactionsAsync(
				cancellationToken);

			var changeTypeDtos = await _repository.GetChangeTypesAsync(
				cancellationToken);

			var userAccountDtos = await _repository.GetUserAccountOptionsAsync(
				cancellationToken);

			return new PointsIndexViewModel
			{
				Transactions = transactionDtos
					.Select(dto => new PointTransactionItemViewModel
					{
						Id = dto.Id,
						UserId = dto.UserId,
						UserAccount = dto.UserAccount,
						ChangeTypeId = dto.ChangeTypeId,
						ActionName = dto.ActionName,
						PointChange = dto.PointChange,
						BalanceAfter = dto.BalanceAfter,
						Description = dto.Description,
						CreatedAt = dto.CreatedAt,
						ModifiedByAdminId = dto.ModifiedByAdminId,
						ModifiedByAdminAccount = dto.ModifiedByAdminAccount,
						UserProductId = dto.UserProductId
					})
					.ToList(),
				ChangeTypes = changeTypeDtos
					.Select(dto => new PointChangeTypeOptionViewModel
					{
						Id = dto.Id,
						ActionName = dto.ActionName
					})
					.ToList(),
				UserAccounts = userAccountDtos
					.Select(dto => new UserAccountOptionViewModel
					{
						Id = dto.Id,
						Account = dto.Account,
						PointBalance = dto.PointBalance
					})
					.ToList()
			};
		}

		public async Task<PointTransactionCreateResultDto> CreateTransactionAsync(
			CreatePointTransactionDto request,
			int? adminId,
			CancellationToken cancellationToken = default)
		{
			var userAccount = request.UserAccount?.Trim() ?? string.Empty;
			var description = request.Description?.Trim() ?? string.Empty;

			if (string.IsNullOrWhiteSpace(userAccount))
			{
				return ValidationFailure("請輸入會員帳號。");
			}

			if (userAccount.Length > 50)
			{
				return ValidationFailure("帳號不可超過 50 個字。");
			}

			if (!request.PointChange.HasValue || request.PointChange.Value == 0)
			{
				return ValidationFailure("點數變化必須是不可為 0 的整數。");
			}

			if (string.IsNullOrWhiteSpace(description))
			{
				return ValidationFailure("請輸入描述。");
			}

			if (description.Length > 100)
			{
				return ValidationFailure("描述不可超過 100 個字。");
			}

			if (!adminId.HasValue || adminId.Value <= 0)
			{
				return new PointTransactionCreateResultDto
				{
					Status = PointTransactionCreateStatus.AdminNotFound,
					Message = "無法辨識目前登入的管理員 ID。"
				};
			}

			var pointChange = request.PointChange.Value;
			var actionName = pointChange > 0
				? GiveActionName
				: DeductActionName;

			return await _repository.CreateTransactionAsync(
				userAccount,
				actionName,
				pointChange,
				description,
				adminId.Value,
				cancellationToken);
		}

		private static PointTransactionCreateResultDto ValidationFailure(
			string message)
		{
			return new PointTransactionCreateResultDto
			{
				Status = PointTransactionCreateStatus.ValidationFailed,
				Message = message
			};
		}
	}
}
