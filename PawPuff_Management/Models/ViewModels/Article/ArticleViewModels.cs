using System.ComponentModel.DataAnnotations;
using PawPuff_Management.Models.Dtos;

namespace PawPuff_Management.ViewModels.Article;
#nullable enable

/// <summary>新增文章表單。</summary>
public class ArticleCreateVm
{
    [Display(Name = "標題")]
    [Required(ErrorMessage = "請輸入標題")]
    [StringLength(100, ErrorMessage = "標題不可超過 100 字")]
    public string Title { get; set; } = string.Empty;

    [Display(Name = "內容")]
    [Required(ErrorMessage = "請輸入內容")]
    [StringLength(4000, ErrorMessage = "內容不可超過 4000 字")]
    public string ArticleContent { get; set; } = string.Empty;

    [Display(Name = "分類")]
    [Range(1, int.MaxValue, ErrorMessage = "請選擇分類")]
    public int CategoryId { get; set; }

    [Display(Name = "上架")]
    public bool IsActive { get; set; } = true;
}

/// <summary>編輯文章表單。</summary>
public class ArticleEditVm
{
    public int Id { get; set; }

    [Display(Name = "標題")]
    [Required(ErrorMessage = "請輸入標題")]
    [StringLength(100, ErrorMessage = "標題不可超過 100 字")]
    public string Title { get; set; } = string.Empty;

    [Display(Name = "內容")]
    [Required(ErrorMessage = "請輸入內容")]
    [StringLength(4000, ErrorMessage = "內容不可超過 4000 字")]
    public string ArticleContent { get; set; } = string.Empty;

    [Display(Name = "分類")]
    [Range(1, int.MaxValue, ErrorMessage = "請選擇分類")]
    public int CategoryId { get; set; }

    [Display(Name = "上架")]
    public bool IsActive { get; set; }
}

/// <summary>新增 / 回覆留言表單。</summary>
public class CommentCreateVm
{
    public int ArticleId { get; set; }
    public int? ParentCommentId { get; set; }

    [Display(Name = "留言")]
    [Required(ErrorMessage = "請輸入留言內容")]
    [StringLength(500, ErrorMessage = "留言不可超過 500 字")]
    public string CommentContent { get; set; } = string.Empty;
}

/// <summary>下拉選單用的分類項目。</summary>
public class CategoryOption
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

/// <summary>
/// 單一 Index 頁的整合 ViewModel:清單 + 篩選 + 新增表單 + 被選取文章的明細面板。
/// </summary>
public class ArticleIndexVm
{
    // 篩選條件(GET)
    public string? Keyword { get; set; }
    public int? CategoryId { get; set; }
    public bool? IsActive { get; set; }

    // 清單與下拉資料
    public List<ArticleListItemDto> Articles { get; set; } = new();
    public List<CategoryOption> Categories { get; set; } = new();

    // 新增面板:Mode == "create" 時顯示
    public string? Mode { get; set; }
    public ArticleCreateVm CreateForm { get; set; } = new();

    // 明細 / 編輯面板:選取某篇文章時才有值
    public ArticleDetailDto? Detail { get; set; }
    public ArticleEditVm EditForm { get; set; } = new();
    public CommentCreateVm NewComment { get; set; } = new();
}
