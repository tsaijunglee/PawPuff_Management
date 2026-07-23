using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management.Models.Repositories
{
	public interface IPointRuleRepository
	{
		Task<List<PointRuleDto>> GetAllAsync(
			CancellationToken cancellationToken = default);

		Task<PointRuleDto?> GetByIdAsync(
			int id,
			CancellationToken cancellationToken = default);

		Task<PointRuleDto?> UpdateFixedRuleAsync(
			int id,
			int defaultValue,
			string description,
			CancellationToken cancellationToken = default);
	}


	public class PointRuleRepository : IPointRuleRepository
	{
		private readonly PawPuffContext _context;
		private readonly ILogger<PointRuleRepository> _logger;

		public PointRuleRepository(
			PawPuffContext context,
			ILogger<PointRuleRepository> logger)
		{
			_context = context;
			_logger = logger;
		}

		public async Task<List<PointRuleDto>> GetAllAsync(
			CancellationToken cancellationToken = default)
		{
			return await _context.PointChangeTypes
				.AsNoTracking()
				.OrderBy(rule => rule.Id)
				.Select(rule => new PointRuleDto
				{
					Id = rule.Id,
					ActionName = rule.ActionName,
					IsFixed = rule.IsFixed,
					DefaultValue = rule.DefaultValue,
					DailyLimit = rule.DailyLimit,
					Description = rule.Description ?? string.Empty
				})
				.ToListAsync(cancellationToken);
		}

		public async Task<PointRuleDto?> GetByIdAsync(
			int id,
			CancellationToken cancellationToken = default)
		{
			return await _context.PointChangeTypes
				.AsNoTracking()
				.Where(rule => rule.Id == id)
				.Select(rule => new PointRuleDto
				{
					Id = rule.Id,
					ActionName = rule.ActionName,
					IsFixed = rule.IsFixed,
					DefaultValue = rule.DefaultValue,
					DailyLimit = rule.DailyLimit,
					Description = rule.Description ?? string.Empty
				})
				.SingleOrDefaultAsync(cancellationToken);
		}

		public async Task<PointRuleDto?> UpdateFixedRuleAsync(
			int id,
			int defaultValue,
			string description,
			CancellationToken cancellationToken = default)
		{
			/*
			 * 明確使用 AsTracking()。
			 * 即使其他專案將 DbContext 預設設定為 NoTracking，
			 * 這筆更新仍會受到 EF Core Change Tracker 追蹤。
			 *
			 * IsFixed 也放入資料庫條件，避免繞過前端或競爭狀態。
			 */
			var entity = await _context.PointChangeTypes
				.AsTracking()
				.SingleOrDefaultAsync(
					rule => rule.Id == id && rule.IsFixed,
					cancellationToken);

			if (entity is null)
			{
				_logger.LogWarning(
					"Point rule {RuleId} does not exist or is not fixed.",
					id);

				return null;
			}

			/*
			 * 只記錄資料庫名稱，不輸出完整連線字串、帳號或密碼。
			 * 可用此紀錄確認執行中的程式是否連到預期資料庫。
			 */
			var databaseName = _context.Database
				.GetDbConnection()
				.Database;

			_logger.LogInformation(
				"Updating point rule {RuleId} in database {DatabaseName}.",
				id,
				databaseName);

			entity.DefaultValue = defaultValue;
			entity.Description = description;

			var affectedEntries = await _context.SaveChangesAsync(
				cancellationToken);

			_logger.LogInformation(
				"SaveChangesAsync completed for point rule {RuleId}. " +
				"Affected entries: {AffectedEntries}.",
				id,
				affectedEntries);

			/*
			 * 從資料庫重新載入，不直接相信記憶體中的 entity。
			 * ReloadAsync 後的值才是目前連線資料庫實際保存的內容。
			 */
			await _context.Entry(entity)
				.ReloadAsync(cancellationToken);

			var isSaved =
				entity.DefaultValue == defaultValue &&
				string.Equals(
					entity.Description,
					description,
					StringComparison.Ordinal);

			if (!isSaved)
			{
				_logger.LogError(
					"Point rule {RuleId} did not retain the requested values " +
					"after SaveChangesAsync.",
					id);

				return null;
			}

			return new PointRuleDto
			{
				Id = entity.Id,
				ActionName = entity.ActionName,
				IsFixed = entity.IsFixed,
				DefaultValue = entity.DefaultValue,
				DailyLimit = entity.DailyLimit,
				Description = entity.Description ?? string.Empty
			};
		}
	}
}
