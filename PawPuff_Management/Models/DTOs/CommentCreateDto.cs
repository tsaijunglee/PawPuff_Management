namespace PawPuff_Management.Models.Dtos
{
	/// <summary>新增留言的輸入。ParentCommentId 為 null 代表新開一串;有值代表回覆某則主留言。</summary>
	public class CommentCreateDto
	{
		public int ArticleId { get; set; }
		public int? ParentCommentId { get; set; }
		public string CommentContent { get; set; } = string.Empty;
	}
}
