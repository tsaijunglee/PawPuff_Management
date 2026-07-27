using System.ComponentModel.DataAnnotations;

namespace PawPuff_Management.Models.DTOs
{
	public class UpdateUserStatusDto
	{
		
			public int UserId { get; set; }

			public bool IsActive { get; set; }

			[StringLength( 100, ErrorMessage = "停用說明不能超過100字。")]
			public string? AdminComment { get; set; }
		
	}
}
