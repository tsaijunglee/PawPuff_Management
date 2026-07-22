using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PawPuff_Management.Models.ViewModels
{
	public class AdminsIndexVM
	{

		public int Id { get; set; }
		public string Account { get; set; }

		public string Nickname { get; set; }

		public string Email { get; set; }

		public bool IsActive { get; set; }


	}
}
