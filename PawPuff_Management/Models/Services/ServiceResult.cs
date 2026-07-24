namespace PawPuff_Management.Models.Services
{
	/// <summary>
	/// Service 層統一的回傳型別。用來把「成功 / 失敗 + 錯誤訊息」帶回 Controller,
	/// 避免用丟例外(exception)來表達可預期的驗證錯誤(例如名稱重複)。
	/// </summary>
	public class ServiceResult
	{
		public bool Success { get; init; }
		public string? Error { get; init; }

		public static ServiceResult Ok() => new() { Success = true };
		public static ServiceResult Fail(string error) => new() { Success = false, Error = error };
	}

	/// <summary>
	/// 需要一併帶回資料時使用(例如新增後回傳新的 Id)。
	/// </summary>
	public class ServiceResult<T> : ServiceResult
	{
		public T? Data { get; init; }

		public static ServiceResult<T> Ok(T data) => new() { Success = true, Data = data };
		public static new ServiceResult<T> Fail(string error) => new() { Success = false, Error = error };
	}


}
