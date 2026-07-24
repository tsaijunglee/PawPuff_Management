using System.ComponentModel.DataAnnotations;
using PawPuff_Management.Models.Infra;

namespace PawPuff_Management.Models.DTOs
{
    /// <summary>
    /// 新增與編輯共用的輸入資料。驗證規則集中在這裡,Controller 只負責檢查 ModelState。
    /// Id = 0 代表新增,大於 0 代表編輯。
    /// </summary>
    public class FaqFormDto
    {
        public int Id { get; set; }

        [Display(Name = "類型")]
        [Required(ErrorMessage = "請選擇類型")]
        [EnumDataType(typeof(FaqType), ErrorMessage = "類型不在可選範圍內")]
        public int Type { get; set; }

        [Display(Name = "問題")]
        [Required(ErrorMessage = "請輸入問題內容")]
        [StringLength(100, ErrorMessage = "問題最多 100 個字")]
        public string Question { get; set; } = string.Empty;

        [Display(Name = "答案")]
        [Required(ErrorMessage = "請輸入答案內容")]
        [StringLength(1000, ErrorMessage = "答案最多 1000 個字")]
        public string Answer { get; set; } = string.Empty;

        [Display(Name = "排序")]
        [Range(0, int.MaxValue, ErrorMessage = "排序不可為負數")]
        public int SortOrder { get; set; }

        [Display(Name = "啟用")]
        public bool IsActive { get; set; } = true;
    }
}
