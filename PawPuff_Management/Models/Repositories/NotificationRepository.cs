using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management.Models.Repositories
{
	public interface INotificationRepository
	{
		Task<List<NotificationAccountOptionDto>> GetUserAccountOptionsAsync(
			CancellationToken cancellationToken = default);

		Task<List<NotificationAccountOptionDto>> GetAdminAccountOptionsAsync(
			int excludedAdminId,
			CancellationToken cancellationToken = default);

		Task<int?> GetUserIdByAccountAsync(
			string account,
			CancellationToken cancellationToken = default);

		Task<int?> GetAdminIdByAccountAsync(
			string account,
			CancellationToken cancellationToken = default);

		Task<bool> IsActiveAdminAsync(
			int adminId,
			CancellationToken cancellationToken = default);

		Task<List<AdminNotificationListItemDto>>
			GetAdminNotificationsAsync(
				int adminId,
				CancellationToken cancellationToken = default);

		Task<int> GetAdminUnreadCountAsync(
			int adminId,
			CancellationToken cancellationToken = default);

		Task<bool> MarkAsReadAsync(
			int notificationId,
			int adminId,
			CancellationToken cancellationToken = default);

		Task<int> MarkAllAsReadAsync(
			int adminId,
			CancellationToken cancellationToken = default);

		Task<NotificationDto?> CreateAsync(
			NotificationCreateRecordDto request,
			CancellationToken cancellationToken = default);
	}

	public class NotificationRepository : INotificationRepository
	{
		private readonly PawPuffContext _context;
		private readonly ILogger<NotificationRepository> _logger;

		public NotificationRepository(
			PawPuffContext context,
			ILogger<NotificationRepository> logger)
		{
			_context = context;
			_logger = logger;
		}

		public async Task<List<NotificationAccountOptionDto>>
			GetUserAccountOptionsAsync(
				CancellationToken cancellationToken = default)
		{
			return await _context.Users
				.AsNoTracking()
				.OrderBy(user => user.Account)
				.Select(user => new NotificationAccountOptionDto
				{
					Id = user.Id,
					Account = user.Account
				})
				.ToListAsync(cancellationToken);
		}

		public async Task<List<NotificationAccountOptionDto>>
			GetAdminAccountOptionsAsync(
				int excludedAdminId,
				CancellationToken cancellationToken = default)
		{
			return await _context.Admins
				.AsNoTracking()
				// 管理員收件者清單不顯示目前登入的管理員本人。
				.Where(admin => admin.Id != excludedAdminId)
				.OrderBy(admin => admin.Account)
				.Select(admin => new NotificationAccountOptionDto
				{
					Id = admin.Id,
					Account = admin.Account
				})
				.ToListAsync(cancellationToken);
		}

		public async Task<int?> GetUserIdByAccountAsync(
			string account,
			CancellationToken cancellationToken = default)
		{
			return await _context.Users
				.AsNoTracking()
				.Where(user => user.Account == account)
				.Select(user => (int?)user.Id)
				.SingleOrDefaultAsync(cancellationToken);
		}

		public async Task<int?> GetAdminIdByAccountAsync(
			string account,
			CancellationToken cancellationToken = default)
		{
			return await _context.Admins
				.AsNoTracking()
				.Where(admin => admin.Account == account)
				.Select(admin => (int?)admin.Id)
				.SingleOrDefaultAsync(cancellationToken);
		}

		public async Task<bool> IsActiveAdminAsync(
			int adminId,
			CancellationToken cancellationToken = default)
		{
			return await _context.Admins
				.AsNoTracking()
				.AnyAsync(
					admin => admin.Id == adminId && admin.IsActive,
					cancellationToken);
		}

		public async Task<List<AdminNotificationListItemDto>>
			GetAdminNotificationsAsync(
				int adminId,
				CancellationToken cancellationToken = default)
		{
			return await _context.Notifications
				.AsNoTracking()
				.Where(notification => notification.AdminId == adminId)
				.OrderByDescending(notification => notification.CreatedAt)
				.ThenByDescending(notification => notification.Id)
				.Select(notification => new AdminNotificationListItemDto
				{
					Id = notification.Id,
					Type = notification.Type,
					NotificationContent = notification.NotificationContent,
					IsRead = notification.IsRead,
					LinkUrl = notification.LinkUrl,
					CreatedAt = notification.CreatedAt,
					SenderAdminId = notification.SenderAdminId,
					SenderAdminNickname = notification.SenderAdmin == null
						? null
						: notification.SenderAdmin.Nickname,
					SenderAdminAccount = notification.SenderAdmin == null
						? null
						: notification.SenderAdmin.Account
				})
				.ToListAsync(cancellationToken);
		}

		public async Task<int> GetAdminUnreadCountAsync(
			int adminId,
			CancellationToken cancellationToken = default)
		{
			return await _context.Notifications
				.AsNoTracking()
				.CountAsync(
					notification =>
						notification.AdminId == adminId &&
						!notification.IsRead,
					cancellationToken);
		}

		public async Task<bool> MarkAsReadAsync(
			int notificationId,
			int adminId,
			CancellationToken cancellationToken = default)
		{
			// 同時比對 Notification.Id 與目前登入的 Admin.Id，
			// 避免管理員修改不屬於自己的通知。
			var affectedRows = await _context.Notifications
				.Where(notification =>
					notification.Id == notificationId &&
					notification.AdminId == adminId)
				.ExecuteUpdateAsync(
					setters => setters.SetProperty(
						notification => notification.IsRead,
						true),
					cancellationToken);

			// 已讀通知再次點選仍會找到該筆資料，因此此操作具冪等性。
			return affectedRows == 1;
		}

		public async Task<int> MarkAllAsReadAsync(
			int adminId,
			CancellationToken cancellationToken = default)
		{
			return await _context.Notifications
				.Where(notification =>
					notification.AdminId == adminId &&
					!notification.IsRead)
				.ExecuteUpdateAsync(
					setters => setters.SetProperty(
						notification => notification.IsRead,
						true),
					cancellationToken);
		}

		public async Task<NotificationDto?> CreateAsync(
			NotificationCreateRecordDto request,
			CancellationToken cancellationToken = default)
		{
			var hasUserRecipient = request.UserId.HasValue;
			var hasAdminRecipient = request.AdminId.HasValue;

			if (hasUserRecipient == hasAdminRecipient)
			{
				throw new ArgumentException(
					"user_id 與 admin_id 必須且只能有一個有值。",
					nameof(request));
			}

			if (request.AdminId == request.SenderAdminId)
			{
				throw new ArgumentException(
					"管理員不可發送通知給自己。",
					nameof(request));
			}

			var entity = new Notification
			{
				UserId = request.UserId,
				AdminId = request.AdminId,
				Type = request.Type,
				NotificationContent = request.NotificationContent,
				IsRead = request.IsRead,
				LinkUrl = request.LinkUrl,
				CreatedAt = request.CreatedAt,
				SenderAdminId = request.SenderAdminId
			};

			_context.Notifications.Add(entity);

			var affectedEntries = await _context.SaveChangesAsync(
				cancellationToken);

			if (affectedEntries != 1)
			{
				_logger.LogError(
					"Creating a notification affected {AffectedEntries} entries. " +
					"UserId: {UserId}, AdminId: {AdminId}, SenderAdminId: {SenderAdminId}.",
					affectedEntries,
					request.UserId,
					request.AdminId,
					request.SenderAdminId);

				return null;
			}

			return new NotificationDto
			{
				Id = entity.Id,
				UserId = entity.UserId,
				AdminId = entity.AdminId,
				Type = entity.Type,
				NotificationContent = entity.NotificationContent,
				IsRead = entity.IsRead,
				LinkUrl = entity.LinkUrl,
				CreatedAt = entity.CreatedAt,
				SenderAdminId = entity.SenderAdminId
			};
		}
	}
}
