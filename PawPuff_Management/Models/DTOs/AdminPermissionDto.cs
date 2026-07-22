using Microsoft.AspNetCore.Mvc;
using static Amazon.S3.Util.S3EventNotification;

namespace PawPuff_Management.Models.DTOs
{
	//Dto是空的
	//
	//資料庫
	//  ↓
	//Repository 查詢 Admin、AdminsPermission
	//  ↓
	//Service 將 Entity 整理成 DTO
	//  ↓
	//Controller 取得 DTO
	//  ↓
	//Index.cshtml 接收 DTO 並顯示
	public class AdminPermissionDto //「管理員及其權限」
	{
		public int AdminId { get; set; } //DB:Admin => AdminId
		public string Account { get; set; } = string.Empty; //DB:Admin => Account
		public string PasswordHash { get; set; } = "********";
		public string Nickname { get; set; } = string.Empty;//DB:Admin => NickName
		public string Email { get; set; }  = string.Empty;

		public bool IsActive { get; set; }

		public DateTime CreatedAt { get; set; }

		public string? AdminComment { get; set; }

		public DateTime? AdminUpdatedAt { get; set; }

		public int? ModifiedByAdminId { get; set; }

		public List<string> Permissions { get; set; } = []; //DB:AdminsPermission => PermissionName


	}


	//用來接收「使用者按下儲存權限後，JavaScript 傳給 Controller 的整包資料」
	public class SaveAdminPermissionsRequestDto //代表一次「儲存管理員權限」的請求
	{
		public List<AdminPermissionUpdateDto> Admins { get; set; } = []; //因為使用者可能一次修改多位管理員，所以使用：List< >
	}


	// =[] 表示預設建立空的 List
	// 等同於
	// public List<AdminPermissionUpdateDto> Admins { get; set; }  = new List<AdminPermissionUpdateDto>();





	//每一個 AdminPermissionUpdateDto 代表其中某一位管理員及其權限
	public class AdminPermissionUpdateDto
	{
		public int AdminId { get; set; }
		public List<string> Permissions { get; set; } = [];
	}
}
