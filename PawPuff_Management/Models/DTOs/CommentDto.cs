namespace PawPuff_Management.Models.DTOs
{
	/// <summary>
	/// 留言。Replies 只會有一層(第二層以下在 Service 端就擋掉了),
	/// 所以子留言的 Replies 一定是空的。
	/// </summary>
	public class CommentDto
	{
		public int Id { get; set; }
		public int ArticleId { get; set; }
		public int? ParentCommentId { get; set; }
		public int? UserId { get; set; }
		public string? AuthorNickname { get; set; }
		public string CommentContent { get; set; } = string.Empty;
		public bool IsActive { get; set; }
		public DateTime CreatedAt { get; set; }
		public string? AdminComment { get; set; }

		public List<CommentDto> Replies { get; set; } = new();
	}
}
