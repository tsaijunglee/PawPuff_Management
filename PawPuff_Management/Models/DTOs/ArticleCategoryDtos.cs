namespace PawPuff_Management.Models.Dtos;

// DTO = Service 與 Controller 之間傳遞的資料。不帶驗證屬性、不綁畫面,
// 只表達「這個功能需要進 / 出哪些欄位」。驗證屬性放在 ViewModel。

/// <summary>讀取用:代表一筆分類。</summary>
public class ArticleCategoryDto
{
	public int Id { get; set; }
	public string Name { get; set; } = string.Empty;
	public bool IsActive { get; set; }
}

/// <summary>新增用。</summary>
public class ArticleCategoryCreateDto
{
	public string Name { get; set; } = string.Empty;
	public bool IsActive { get; set; } = true;
}

/// <summary>編輯用。</summary>
public class ArticleCategoryEditDto
{
	public int Id { get; set; }
	public string Name { get; set; } = string.Empty;
	public bool IsActive { get; set; }
}
