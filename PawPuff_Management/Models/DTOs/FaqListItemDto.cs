namespace PawPuff_Management.Models.DTOs
{
    /// <summary>
    /// 清單一列的資料。時間已經是「到分」的字串,View 與 JS 拿到即可直接用,
    /// 不需要再做任何格式處理,也不可能漏出秒數。
    /// </summary>
    public class FaqListItemDto
    {
        public int Id { get; set; }

        /// <summary>類別的數字,對應 faqs.type。</summary>
        public int Type { get; set; }

        /// <summary>類別的中文名稱,例如「帳號」。</summary>
        public string TypeName { get; set; } = string.Empty;

        public string Question { get; set; } = string.Empty;
        public string Answer { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }

        /// <summary>建立時間,格式 yyyy-MM-dd HH:mm</summary>
        public string CreatedAtText { get; set; } = string.Empty;

        /// <summary>最終修改時間,格式 yyyy-MM-dd HH:mm</summary>
        public string UpdatedAtText { get; set; } = string.Empty;
    }
}
