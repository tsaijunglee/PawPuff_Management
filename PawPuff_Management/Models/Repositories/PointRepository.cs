using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.EfModels;
using System.Data;

namespace PawPuff_Management.Models.Repositories
{
	public interface IPointRepository
	{
		Task<List<PointTransactionDto>> GetTransactionsAsync(
			CancellationToken cancellationToken = default);

		Task<List<PointChangeTypeOptionDto>> GetChangeTypesAsync(
			CancellationToken cancellationToken = default);

		Task<List<UserAccountOptionDto>> GetUserAccountOptionsAsync(
			CancellationToken cancellationToken = default);

		Task<PointTransactionCreateResultDto> CreateTransactionAsync(
			string userAccount,
			string actionName,
			int pointChange,
			string description,
			int adminId,
			CancellationToken cancellationToken = default);
	}

	public class PointRepository : IPointRepository
	{
		private readonly PawPuffContext _context;
		private readonly ILogger<PointRepository> _logger;

		public PointRepository(
			PawPuffContext context,
			ILogger<PointRepository> logger)
		{
			_context = context;
			_logger = logger;
		}

		public async Task<List<PointTransactionDto>> GetTransactionsAsync(
			CancellationToken cancellationToken = default)
		{
			return await _context.PointTransactions
				.AsNoTracking()
				.OrderByDescending(transaction => transaction.CreatedAt)
				.ThenByDescending(transaction => transaction.Id)
				.Select(transaction => new PointTransactionDto
				{
					Id = transaction.Id,
					UserId = transaction.UserId,
					UserAccount = transaction.User.Account,
					ChangeTypeId = transaction.ChangeTypeId,
					ActionName = transaction.ChangeType.ActionName,
					PointChange = transaction.PointChange,
					BalanceAfter = transaction.BalanceAfter,
					Description = transaction.Description,
					CreatedAt = transaction.CreatedAt,
					ModifiedByAdminId = transaction.ModifiedByAdminId,
					ModifiedByAdminAccount = transaction.ModifiedByAdmin == null
						? null
						: transaction.ModifiedByAdmin.Account,
					UserProductId = transaction.UserProductId
				})
				.ToListAsync(cancellationToken);
		}

		public async Task<List<PointChangeTypeOptionDto>> GetChangeTypesAsync(
			CancellationToken cancellationToken = default)
		{
			return await _context.PointChangeTypes
				.AsNoTracking()
				.OrderBy(changeType => changeType.Id)
				.Select(changeType => new PointChangeTypeOptionDto
				{
					Id = changeType.Id,
					ActionName = changeType.ActionName
				})
				.ToListAsync(cancellationToken);
		}

		public async Task<List<UserAccountOptionDto>> GetUserAccountOptionsAsync(
			CancellationToken cancellationToken = default)
		{
			// 依目前需求一次提供 User 資料表的所有 account，
			// 供 Razor 產生可輸入文字的 datalist 下拉選項。
			return await _context.Users
				.AsNoTracking()
				.OrderBy(user => user.Account)
				.Select(user => new UserAccountOptionDto
				{
					Id = user.Id,
					Account = user.Account,
					PointBalance = user.PointBalance
				})
				.ToListAsync(cancellationToken);
		}

		public async Task<PointTransactionCreateResultDto> CreateTransactionAsync(
			string userAccount,
			string actionName,
			int pointChange,
			string description,
			int adminId,
			CancellationToken cancellationToken = default)
		{
			await using var databaseTransaction =
				await _context.Database.BeginTransactionAsync(
					IsolationLevel.Serializable,
					cancellationToken);

			try
			{
				var user = await _context.Users
					.AsTracking()
					.SingleOrDefaultAsync(
						item => item.Account == userAccount,
						cancellationToken);

				if (user is null)
				{
					await databaseTransaction.RollbackAsync(cancellationToken);

					return CreateFailure(
						PointTransactionCreateStatus.UserNotFound,
						"找不到指定的會員帳號。");
				}

				var changeType = await _context.PointChangeTypes
					.AsNoTracking()
					.SingleOrDefaultAsync(
						item => item.ActionName == actionName,
						cancellationToken);

				if (changeType is null)
				{
					await databaseTransaction.RollbackAsync(cancellationToken);

					return CreateFailure(
						PointTransactionCreateStatus.ChangeTypeNotFound,
						$"找不到「{actionName}」點數規則。");
				}

				// TODO [登入串接]
				// Controller 應從登入 Claim 傳入目前管理員的 Admin.Id。
				// 現階段開發環境暫傳 1，並假定 admins.id = 1 的帳號是 admin01。
				// Repository 仍重新查詢 Admin，是為了確認該 ID 存在、仍為啟用狀態，
				// 並取得要回傳給畫面顯示的 Admin.Account。
				var admin = await _context.Admins
					.AsNoTracking()
					.SingleOrDefaultAsync(
						item => item.Id == adminId && item.IsActive,
						cancellationToken);

				if (admin is null)
				{
					await databaseTransaction.RollbackAsync(cancellationToken);

					return CreateFailure(
						PointTransactionCreateStatus.AdminNotFound,
						"找不到目前操作中的有效管理員資料。");
				}

				var nextBalanceLong =
					(long)user.PointBalance + pointChange;

				// 扣除點數時，不允許變更後的會員餘額小於 0。
				// 此檢查放在 Serializable 資料庫交易中，使用的是本次交易內
				// 重新查到的 User.PointBalance，不採用可能已過期的前端餘額。
				if (pointChange < 0 && nextBalanceLong < 0)
				{
					await databaseTransaction.RollbackAsync(cancellationToken);

					var requestedDeduction = Math.Abs((long)pointChange);

					return CreateFailure(
						PointTransactionCreateStatus.InsufficientBalance,
						$"會員目前只有 {user.PointBalance:N0} 點，" +
						$"無法扣除 {requestedDeduction:N0} 點。");
				}

				if (nextBalanceLong < int.MinValue ||
					nextBalanceLong > int.MaxValue)
				{
					await databaseTransaction.RollbackAsync(cancellationToken);

					return CreateFailure(
						PointTransactionCreateStatus.BalanceOverflow,
						"變更後的會員點數超出系統可儲存範圍。");
				}

				var nextBalance = (int)nextBalanceLong;
				var createdAt = DateTime.Now;

				user.PointBalance = nextBalance;

				var entity = new PointTransaction
				{
					UserId = user.Id,
					ChangeTypeId = changeType.Id,
					PointChange = pointChange,
					BalanceAfter = nextBalance,
					Description = description,
					CreatedAt = createdAt,
					// 目前未串登入時會是 1；正式串接後則是登入 Claim 內的 Admin.Id。
					ModifiedByAdminId = admin.Id,
					UserProductId = null
				};

				_context.PointTransactions.Add(entity);

				var affectedEntries = await _context.SaveChangesAsync(
					cancellationToken);

				if (affectedEntries < 2)
				{
					await databaseTransaction.RollbackAsync(cancellationToken);

					_logger.LogError(
						"Creating point transaction for user {UserId} " +
						"affected only {AffectedEntries} entries.",
						user.Id,
						affectedEntries);

					return CreateFailure(
						PointTransactionCreateStatus.PersistenceFailed,
						"點數餘額與異動紀錄未能完整寫入。");
				}

				await databaseTransaction.CommitAsync(cancellationToken);

				return new PointTransactionCreateResultDto
				{
					Status = PointTransactionCreateStatus.Success,
					Message = "已新增點數變更紀錄。",
					Transaction = new PointTransactionDto
					{
						Id = entity.Id,
						UserId = user.Id,
						UserAccount = user.Account,
						ChangeTypeId = changeType.Id,
						ActionName = changeType.ActionName,
						PointChange = entity.PointChange,
						BalanceAfter = entity.BalanceAfter,
						Description = entity.Description,
						CreatedAt = entity.CreatedAt,
						ModifiedByAdminId = admin.Id,
						ModifiedByAdminAccount = admin.Account,
						UserProductId = null
					}
				};
			}
			catch
			{
				await databaseTransaction.RollbackAsync(cancellationToken);
				throw;
			}
		}

		private static PointTransactionCreateResultDto CreateFailure(
			PointTransactionCreateStatus status,
			string message)
		{
			return new PointTransactionCreateResultDto
			{
				Status = status,
				Message = message
			};
		}
	}
}
