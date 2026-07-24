namespace PawPuff_Management.Models.Dtos
{
	/// <summary>
	/// 詳情頁「檢視按讚 / 檢視收藏」用。Type = "like"(讚)或 "favorite"(收藏),
	/// 對應前端隱藏節點 data-article-reaction 的值。
	/// </summary>
	public class ArticleReactionRowDto
	{
		public int ArticleId { get; set; }
		public string Type { get; set; } = string.Empty;   // "like" / "favorite"
		public string? Account { get; set; }
		public DateTime CreatedAt { get; set; }
	}



	/// <summary>
	/// 詳情頁「留言一覽」用。欄位對齊前端隱藏節點 data-article-comment 的 data-*。
	/// 含停用的留言(後台要能審核),巢狀靠 ParentCommentId。
	/// </summary>
	public class CommentRowDto
	{
		public int Id { get; set; }
		public int ArticleId { get; set; }
		public int? ParentCommentId { get; set; }
		public int? UserId { get; set; } 
		public string? UserName { get; set; }
		public string? Account { get; set; }
		public string CommentContent { get; set; } = string.Empty;
		public bool IsActive { get; set; }
		public DateTime CreatedAt { get; set; }
		public DateTime? UpdatedAt { get; set; }
		public string? AdminComment { get; set; }
		public DateTime? AdminUpdatedAt { get; set; }
		public string? ModifiedByAdminAccount { get; set; }
		public List<CommentRowDto> Replies { get; set; } = new();
	}
}
