namespace PawPuff_Management.Models.DTOs
{
    /// <summary>
    /// 清單查詢條件。目前篩選是前端 JS 在做,這個 DTO 留給之後
    /// 要改成後端篩選或分頁時使用,Repository 已經支援。
    /// </summary>
    public class FaqQueryDto
    {
        /// <summary>問題類別;null 代表全部類別。</summary>
        public int? Type { get; set; }

        /// <summary>只比對問題內容的關鍵字。</summary>
        public string? QuestionKeyword { get; set; }

        /// <summary>只比對答案內容的關鍵字。</summary>
        public string? AnswerKeyword { get; set; }

        /// <summary>是否連停用的一起顯示。後台預設 true,才看得到被軟刪除的資料。</summary>
        public bool IncludeInactive { get; set; } = true;
    }
}
