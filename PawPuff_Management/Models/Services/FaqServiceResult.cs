namespace PawPuff_Management.Models.Services
{
    /// <summary>
    /// FAQ Service 層統一的回傳格式。Controller 只需要看 Success 與 Message,
    /// 不用靠丟例外來傳遞「問題重複」這種商業規則。
    /// </summary>
    public class FaqServiceResult
    {
        public bool Success { get; init; }
        public string Message { get; init; } = string.Empty;

        /// <summary>欄位層級的錯誤,key 是 DTO 屬性名,給前端標紅用。</summary>
        public Dictionary<string, string> FieldErrors { get; init; } = new();

        public static FaqServiceResult Ok(string message = "")
            => new() { Success = true, Message = message };

        public static FaqServiceResult Fail(string message)
            => new() { Success = false, Message = message };

        public static FaqServiceResult FieldFail(string field, string message)
            => new()
            {
                Success = false,
                Message = message,
                FieldErrors = new Dictionary<string, string> { [field] = message }
            };
    }

    /// <summary>
    /// 需要把資料一起帶回去時用這個。例如存檔後回傳整列最新資料。
    /// </summary>
    public class FaqServiceResult<T> : FaqServiceResult
    {
        public T? Data { get; init; }

        public static FaqServiceResult<T> OkWith(T data, string message = "")
            => new() { Success = true, Message = message, Data = data };

        public static new FaqServiceResult<T> Fail(string message)
            => new() { Success = false, Message = message };

        public static new FaqServiceResult<T> FieldFail(string field, string message)
            => new()
            {
                Success = false,
                Message = message,
                FieldErrors = new Dictionary<string, string> { [field] = message }
            };
    }
}
