using PawPuff_Management.Models.DTOs;

namespace PawPuff_Management.Models.Dtos;
#nullable enable

// ---- 讀取用(read model)----

/// <summary>清單每一列。含各種計數,由 Repository 用一次投影查詢算出,避免 N+1。</summary>
public class ArticleListItemDto
{
	public int Id { get; set; }
	public string Title { get; set; } = string.Empty;
	public string ArticleContent { get; set; } = string.Empty;
	public int CategoryId { get; set; }
	public string CategoryName { get; set; } = string.Empty;
	public string? AuthorNickname { get; set; }
	public string? AuthorAccount { get; set; }
	public bool IsActive { get; set; }
	public DateTime CreatedAt { get; set; }
	public DateTime? UpdatedAt { get; set; }
	public string? AdminComment { get; set; }
	public DateTime? AdminUpdatedAt { get; set; }
	public string? ModifiedByAdminAccount { get; set; }
	public int LikeCount { get; set; }
	public int SaveCount { get; set; }
	public int CommentCount { get; set; }
	public int ImageCount { get; set; }
	public List<string> ImageNames { get; set; } = new();
}

/// <summary>被選取文章的完整明細(給 Index 的管理面板用)。</summary>
public class ArticleDetailDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ArticleContent { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int? UserId { get; set; }
    public string? AuthorNickname { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? AdminComment { get; set; }
    public DateTime? AdminUpdatedAt { get; set; }

    public int LikeCount { get; set; }
    public int SaveCount { get; set; }
    public bool LikedByCurrentUser { get; set; }
    public bool SavedByCurrentUser { get; set; }

    public List<ArticleImageDto> Images { get; set; } = new();
    public List<CommentDto> Comments { get; set; } = new();  // 巢狀(只到一層)
}

// ---- 寫入用(input)----

public class ArticleCreateDto
{
    public string Title { get; set; } = string.Empty;
    public string ArticleContent { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public bool IsActive { get; set; } = true;
}

public class ArticleEditDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ArticleContent { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public bool IsActive { get; set; }
}

