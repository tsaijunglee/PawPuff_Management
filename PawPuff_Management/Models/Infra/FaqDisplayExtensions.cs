using System.ComponentModel.DataAnnotations;
using System.Reflection;

namespace PawPuff_Management.Models.Infra
{
    /// <summary>
    /// FAQ 模組的顯示規則。時間格式只在這裡定義一次,要改格式只改這裡。
    /// 類別名稱刻意加上 Faq 前綴,避免與其他模組的擴充方法撞名。
    /// </summary>
    public static class FaqDisplayExtensions
    {
        /// <summary>顯示與傳輸統一使用的時間格式:到分,不到秒。</summary>
        public const string MinuteFormat = "yyyy-MM-dd HH:mm";

        /// <summary>把秒與毫秒歸零。寫入資料庫前呼叫,資料庫裡就不會存在秒數。</summary>
        public static DateTime TruncateToMinute(this DateTime value)
        {
            return new DateTime(value.Year, value.Month, value.Day,
                                value.Hour, value.Minute, 0, value.Kind);
        }

        /// <summary>輸出到分的字串,給 View 與 JSON 用。</summary>
        public static string ToMinuteText(this DateTime value)
        {
            return value.ToString(MinuteFormat);
        }

        /// <summary>
        /// DateTime? 版本。EF Core Power Tools 產生的實體欄位可能是可為 null 的,
        /// 兩種型別都準備好,不管你的 Faq.UpdatedAt 是 DateTime 還是 DateTime? 都能編譯。
        /// null 時回傳空字串,不會印出「NULL」字樣。
        /// </summary>
        public static string ToMinuteText(this DateTime? value)
        {
            return value.HasValue ? value.Value.ToString(MinuteFormat) : string.Empty;
        }

        /// <summary>取 enum 上 [Display(Name = "...")] 的中文名稱,沒有標記就回傳原名。</summary>
        public static string ToDisplayName(this Enum value)
        {
            MemberInfo? member = value.GetType().GetMember(value.ToString()).FirstOrDefault();
            DisplayAttribute? attribute = member?.GetCustomAttribute<DisplayAttribute>();
            return attribute?.Name ?? value.ToString();
        }

        /// <summary>把資料庫的 int 轉成類別名稱;遇到未定義的值回傳「未分類」而不是爆掉。</summary>
        public static string ToTypeName<TEnum>(this int value) where TEnum : struct, Enum
        {
            return Enum.IsDefined(typeof(TEnum), value)
                ? ((Enum)Enum.ToObject(typeof(TEnum), value)).ToDisplayName()
                : "未分類";
        }
    }
}
