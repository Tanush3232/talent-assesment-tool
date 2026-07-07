"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus, ShieldAlert, X } from "lucide-react";
import { addSingleEmployee } from "@/app/actions/employee";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const employeeSchema = z.object({
  id: z.string().min(1, "Employee ID is required"),
  name: z.string().min(1, "Employee Name is required"),
  email: z.string().email("Invalid email format"),
  designation: z.string().min(1, "Designation is required"),
  impactLevel: z.string().min(1, "Impact Level is required"),
  entity: z.string().min(1, "Entity is required"),
  managerId: z.string().min(1, "Manager ID is required"),
  managerEmail: z.string().email("Invalid manager email"),
  department: z.string().min(1, "Department is required"),
  location: z.string().min(1, "Location is required"),
  hrbpName: z.string().optional(),
});

export default function AddEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      id: "",
      name: "",
      email: "",
      designation: "",
      impactLevel: "",
      entity: "",
      managerId: "",
      managerEmail: "",
      department: "",
      location: "",
      hrbpName: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof employeeSchema>) => {
    setIsSubmitting(true);
    try {
      const res = await addSingleEmployee(data);
      if (res.success) {
        toast.success("Employee added successfully!");
        setOpen(false);
        form.reset();
      } else {
        toast.error(res.error || "Failed to add employee");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="border-slate-200"><UserPlus className="w-4 h-4 mr-2" /> Single Add</Button>} />
      
      <DialogContent className="sm:max-w-[600px] p-5 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center gap-2 border-b border-slate-100 pb-3 mb-3">
          <div className="p-1.5 bg-zuari-red/10 rounded-lg text-zuari-red">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight text-slate-900">Add New Employee Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Employee ID *</label>
              <input {...form.register("id")} className="w-full h-9 px-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="EMP008" />
              {form.formState.errors.id && <p className="text-xs text-zuari-red mt-1">{form.formState.errors.id.message}</p>}
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Employee Name *</label>
              <input {...form.register("name")} className="w-full h-9 px-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="John Doe" />
              {form.formState.errors.name && <p className="text-xs text-zuari-red mt-1">{form.formState.errors.name.message}</p>}
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Employee Email</label>
              <input {...form.register("email")} className="w-full h-9 px-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="john.doe@zuari.com" />
              {form.formState.errors.email && <p className="text-xs text-zuari-red mt-1">{form.formState.errors.email.message}</p>}
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Designation (Role) *</label>
              <input {...form.register("designation")} className="w-full h-9 px-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Senior Consultant" />
              {form.formState.errors.designation && <p className="text-xs text-zuari-red mt-1">{form.formState.errors.designation.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Impact Level</label>
              <input {...form.register("impactLevel")} className="w-full h-9 px-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Medium" />
              {form.formState.errors.impactLevel && <p className="text-xs text-zuari-red mt-1">{form.formState.errors.impactLevel.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Employee Entity</label>
              <input {...form.register("entity")} className="w-full h-9 px-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Zuari Industries Ltd" />
              {form.formState.errors.entity && <p className="text-xs text-zuari-red mt-1">{form.formState.errors.entity.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Manager ID</label>
              <input {...form.register("managerId")} className="w-full h-9 px-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="MGR001" />
              {form.formState.errors.managerId && <p className="text-xs text-zuari-red mt-1">{form.formState.errors.managerId.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Manager Email</label>
              <input {...form.register("managerEmail")} className="w-full h-9 px-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="sandeep.sharma@zuari.com" />
              {form.formState.errors.managerEmail && <p className="text-xs text-zuari-red mt-1">{form.formState.errors.managerEmail.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Department</label>
              <input {...form.register("department")} className="w-full h-9 px-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Engineering & R&D" />
              {form.formState.errors.department && <p className="text-xs text-zuari-red mt-1">{form.formState.errors.department.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Location</label>
              <input {...form.register("location")} className="w-full h-9 px-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary text-sm" placeholder="Bengaluru Outer Ring Road CoE" />
              {form.formState.errors.location && <p className="text-xs text-zuari-red mt-1">{form.formState.errors.location.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">HRBP Name</label>
              <input {...form.register("hrbpName")} className="w-full h-9 px-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary text-sm" placeholder="Amit Kumar" />
              {form.formState.errors.hrbpName && <p className="text-xs text-zuari-red mt-1">{form.formState.errors.hrbpName.message}</p>}
            </div>
          </div>

          <DialogFooter className="bg-transparent border-t-0 p-0 sm:justify-end gap-2 mt-8">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting} className="border-slate-200 text-slate-700 font-medium px-6 h-9">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#0b1021] hover:bg-slate-900 text-white font-medium px-6 h-9">
              {isSubmitting ? "Registering..." : "Register Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
