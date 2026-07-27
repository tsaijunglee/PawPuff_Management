using System.ComponentModel.DataAnnotations;

namespace PawPuff_Management.ViewModels.ArticleCategory;

// ViewModel = Controller 與 View 之間的資料。畫面驗證(Required、長度…)放這裡,
// 因為驗證是「畫面/輸入」的責任,DTO 保持乾淨。

/// <summary>清單頁每一列。</summary>
public class ArticleCategoryIndexItemVm
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

/// <summary>新增表單。</summary>
public class ArticleCategoryCreateVm
{
    [Display(Name = "分類名稱")]
    [Required(ErrorMessage = "請輸入分類名稱")]
    [StringLength(50, ErrorMessage = "分類名稱不可超過 50 個字")]
    public string Name { get; set; } = string.Empty;

    [Display(Name = "啟用")]
    public bool IsActive { get; set; } = true;
}

/// <summary>編輯表單。</summary>
public class ArticleCategoryEditVm
{
    public int Id { get; set; }

    [Display(Name = "分類名稱")]
    [Required(ErrorMessage = "請輸入分類名稱")]
    [StringLength(50, ErrorMessage = "分類名稱不可超過 50 個字")]
    public string Name { get; set; } = string.Empty;

    [Display(Name = "啟用")]
    public bool IsActive { get; set; }
}
