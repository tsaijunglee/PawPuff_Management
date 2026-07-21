namespace PawPuff_Management.Models.DTOs
{
	/// <summary>圖片。Url 是由 R2 公開網址 + 資料夾 + ImageName 組出來的顯示網址。</summary>
	public class ArticleImageDto
	{
		public int Id { get; set; }
		public int ArticleId { get; set; }
		public string ImageName { get; set; } = string.Empty;
		public int ImageOrder { get; set; }
		public string Url { get; set; } = string.Empty;
	}
}
