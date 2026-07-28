using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.Repositories;
using PawPuff_Management.Models.ViewModels;

namespace PawPuff_Management.Models.Services
{
	public interface INotificationService
	{
		Task<NotificationsIndexViewModel> GetIndexViewModelAsync(
			int senderAdminId,
			CancellationToken cancellationToken = default);

		Task<NotificationSendResultDto> SendAsync(
			CreateAdminNotificationDto request,
			int? senderAdminId,
			CancellationToken cancellationToken = default);

		Task<AdminNotificationCenterViewModel>
			GetAdminNotificationCenterAsync(
				int adminId,
				CancellationToken cancellationToken = default);

		Task<NotificationReadResultDto> MarkAsReadAsync(
			int notificationId,
			int adminId,
			CancellationToken cancellationToken = default);

		Task<NotificationReadResultDto> MarkAllAsReadAsync(
			int adminId,
			CancellationToken cancellationToken = default);
	}

	public class NotificationService : INotificationService
	{
		private const string AdminSendMessageType = "ADMIN_SEND_MESSAGE";

		private readonly INotificationRepository _repository;

		public NotificationService(INotificationRepository repository)
		{
			_repository = repository;
		}

		public async Task<NotificationsIndexViewModel> GetIndexViewModelAsync(
			int senderAdminId,
			CancellationToken cancellationToken = default)
		{
			// Repository 共用同一個 scoped DbContext，EF Core 不允許同一個
			// DbContext 同時執行多個查詢，所以此處依序 await。
			var userDtos = await _repository.GetUserAccountOptionsAsync(
				cancellationToken);

			var adminDtos = await _repository.GetAdminAccountOptionsAsync(
				senderAdminId,
				cancellationToken);

			return new NotificationsIndexViewModel
			{
				UserAccounts = userDtos
					.Select(dto => new NotificationAccountOptionViewModel
					{
						Id = dto.Id,
						Account = dto.Account
					})
					.ToList(),
				AdminAccounts = adminDtos
					.Select(dto => new NotificationAccountOptionViewModel
					{
						Id = dto.Id,
						Account = dto.Account
					})
					.ToList()
			};
		}

		public async Task<NotificationSendResultDto> SendAsync(
			CreateAdminNotificationDto request,
			int? senderAdminId,
			CancellationToken cancellationToken = default)
		{
			var recipientType = request.RecipientType?.Trim().ToLowerInvariant()
				?? string.Empty;
			var recipientAccount = request.RecipientAccount?.Trim()
				?? string.Empty;
			var notificationContent = request.NotificationContent?.Trim()
				?? string.Empty;

			if (recipientType != NotificationRecipientTypes.User &&
				recipientType != NotificationRecipientTypes.Admin)
			{
				return ValidationFailure("請選擇正確的訊息傳送對象。");
			}

			if (string.IsNullOrWhiteSpace(recipientAccount))
			{
				return ValidationFailure("請輸入收件者帳號。");
			}

			if (recipientAccount.Length > 50)
			{
				return ValidationFailure("帳號不可超過 50 個字。");
			}

			if (string.IsNullOrWhiteSpace(notificationContent))
			{
				return ValidationFailure("請輸入通知內容。");
			}

			if (notificationContent.Length > 100)
			{
				return ValidationFailure("通知內容不可超過 100 個字。");
			}

			if (!senderAdminId.HasValue || senderAdminId.Value <= 0)
			{
				return new NotificationSendResultDto
				{
					Status = NotificationSendStatus.SenderAdminNotFound,
					Message = "無法辨識目前登入的管理員 ID。"
				};
			}

			var senderExists = await _repository.IsActiveAdminAsync(
				senderAdminId.Value,
				cancellationToken);

			if (!senderExists)
			{
				return new NotificationSendResultDto
				{
					Status = NotificationSendStatus.SenderAdminNotFound,
					Message = "找不到目前登入的有效管理員資料。"
				};
			}

			int? userId = null;
			int? adminId = null;

			if (recipientType == NotificationRecipientTypes.User)
			{
				userId = await _repository.GetUserIdByAccountAsync(
					recipientAccount,
					cancellationToken);

				if (!userId.HasValue)
				{
					return RecipientNotFound("找不到指定的會員帳號。");
				}
			}
			else
			{
				adminId = await _repository.GetAdminIdByAccountAsync(
					recipientAccount,
					cancellationToken);

				if (!adminId.HasValue)
				{
					return RecipientNotFound("找不到指定的管理員帳號。");
				}

				// 即使有人略過前端 datalist，直接呼叫 Send API，
				// 仍以資料庫查到的 Admin.Id 判斷，不允許發送給自己。
				if (adminId.Value == senderAdminId.Value)
				{
					return ValidationFailure("管理員不可發送通知給自己。");
				}
			}

			var notification = await _repository.CreateAsync(
				new NotificationCreateRecordDto
				{
					UserId = userId,
					AdminId = adminId,
					Type = AdminSendMessageType,
					NotificationContent = notificationContent,
					IsRead = false,
					LinkUrl = null,
					CreatedAt = DateTime.Now,
					SenderAdminId = senderAdminId.Value
				},
				cancellationToken);

			if (notification is null)
			{
				return new NotificationSendResultDto
				{
					Status = NotificationSendStatus.PersistenceFailed,
					Message = "通知未能完整寫入資料庫。"
				};
			}

			return new NotificationSendResultDto
			{
				Status = NotificationSendStatus.Success,
				Message = $"已發送訊息給「{recipientAccount}」。",
				Notification = notification
			};
		}

		public async Task<AdminNotificationCenterViewModel>
			GetAdminNotificationCenterAsync(
				int adminId,
				CancellationToken cancellationToken = default)
		{
			if (adminId <= 0)
			{
				return new AdminNotificationCenterViewModel();
			}

			var notificationDtos =
				await _repository.GetAdminNotificationsAsync(
					adminId,
					cancellationToken);

			// 同一次輸出使用相同的 now，避免清單在分鐘交界時顯示不一致。
			var now = DateTime.Now;

			var notifications = notificationDtos
				.Select(dto => new AdminNotificationItemViewModel
				{
					Id = dto.Id,
					Type = dto.Type,
					NotificationContent = dto.NotificationContent,
					IsRead = dto.IsRead,
					LinkUrl = dto.LinkUrl,
					CreatedAt = dto.CreatedAt,
					CreatedAtDisplay = FormatCreatedAt(dto.CreatedAt, now),
					SenderAdminId = dto.SenderAdminId,
					SenderAdminNickname = dto.SenderAdminNickname,
					SenderAdminAccount = dto.SenderAdminAccount
				})
				.ToList();

			return new AdminNotificationCenterViewModel
			{
				Notifications = notifications,
				UnreadCount = notifications.Count(item => !item.IsRead)
			};
		}

		public async Task<NotificationReadResultDto> MarkAsReadAsync(
			int notificationId,
			int adminId,
			CancellationToken cancellationToken = default)
		{
			if (notificationId <= 0 || adminId <= 0)
			{
				return ReadFailure(
					NotificationReadStatus.ValidationFailed,
					"通知編號或管理員編號不正確。");
			}

			var updated = await _repository.MarkAsReadAsync(
				notificationId,
				adminId,
				cancellationToken);

			if (!updated)
			{
				return ReadFailure(
					NotificationReadStatus.NotificationNotFound,
					"找不到屬於目前管理員的通知。");
			}

			var unreadCount = await _repository.GetAdminUnreadCountAsync(
				adminId,
				cancellationToken);

			return new NotificationReadResultDto
			{
				Status = NotificationReadStatus.Success,
				Message = "通知已設為已讀。",
				UnreadCount = unreadCount
			};
		}

		public async Task<NotificationReadResultDto> MarkAllAsReadAsync(
			int adminId,
			CancellationToken cancellationToken = default)
		{
			if (adminId <= 0)
			{
				return ReadFailure(
					NotificationReadStatus.ValidationFailed,
					"管理員編號不正確。");
			}

			await _repository.MarkAllAsReadAsync(
				adminId,
				cancellationToken);

			var unreadCount = await _repository.GetAdminUnreadCountAsync(
				adminId,
				cancellationToken);

			return new NotificationReadResultDto
			{
				Status = NotificationReadStatus.Success,
				Message = "所有通知已設為已讀。",
				UnreadCount = unreadCount
			};
		}

		private static string FormatCreatedAt(
			DateTime createdAt,
			DateTime now)
		{
			var elapsed = now - createdAt;

			if (elapsed <= TimeSpan.Zero ||
				elapsed < TimeSpan.FromMinutes(1))
			{
				return "剛剛";
			}

			if (elapsed < TimeSpan.FromHours(1))
			{
				var minutes = Math.Max(
					1,
					(int)Math.Floor(elapsed.TotalMinutes));

				return $"{minutes} 分鐘前";
			}

			if (elapsed < TimeSpan.FromDays(1))
			{
				var hours = Math.Max(
					1,
					(int)Math.Floor(elapsed.TotalHours));

				return $"{hours} 小時前";
			}

			return createdAt.ToString("yyyy-MM-dd");
		}

		private static NotificationSendResultDto ValidationFailure(
			string message)
		{
			return new NotificationSendResultDto
			{
				Status = NotificationSendStatus.ValidationFailed,
				Message = message
			};
		}

		private static NotificationSendResultDto RecipientNotFound(
			string message)
		{
			return new NotificationSendResultDto
			{
				Status = NotificationSendStatus.RecipientNotFound,
				Message = message
			};
		}

		private static NotificationReadResultDto ReadFailure(
			NotificationReadStatus status,
			string message)
		{
			return new NotificationReadResultDto
			{
				Status = status,
				Message = message
			};
		}
	}
}
