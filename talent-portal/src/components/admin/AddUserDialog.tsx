"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus, ShieldAlert } from "lucide-react";
import { addSystemUser, updateSystemUser } from "@/app/actions/user";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  role: z.enum(["ADMIN", "HR", "MANAGER"], { message: "Role is required" }),
  designation: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
});

// Serves "Add User" (no props) and "Edit" (pass `user` + `onClose`). Edit also exposes Active/Suspended.
export default function AddUserDialog({ user, onClose }: { user?: any; onClose?: () => void }) {
  const isEdit = !!user;
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActive, setIsActive] = useState<boolean>(user?.isActive ?? true);

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "MANAGER", // default role
      designation: user?.designation ?? "",
      department: user?.department ?? "",
      location: user?.location ?? "",
    },
  });

  const onSubmit = async (data: z.infer<typeof userSchema>) => {
    setIsSubmitting(true);
    try {
      const res = isEdit ? await updateSystemUser({ ...data, id: user.id, isActive }) : await addSystemUser(data);
      if (res.success) {
        toast.success(isEdit ? "System User updated!" : "System User added successfully!");
        setOpen(false);
        onClose?.();
        form.reset();
      } else {
        toast.error(res.error || "Failed to save system user");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isEdit || open} onOpenChange={(v) => (isEdit ? !v && onClose?.() : setOpen(v))}>
      {!isEdit && <DialogTrigger render={<Button className="bg-zuari-blue hover:bg-zuari-blue/90 text-white"><UserPlus className="w-4 h-4 mr-2" /> Add User</Button>} />}
      
      <DialogContent className="sm:max-w-[450px] p-5 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center gap-2 border-b border-slate-100 pb-3 mb-3">
          <div className="p-1.5 bg-zuari-blue/10 rounded-lg text-zuari-blue">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight text-slate-900">{isEdit ? `Edit System User` : "Add System User"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Name *</label>
            <input {...form.register("name")} className="w-full h-9 px-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Alice Smith" />
            {form.formState.errors.name && <p className="text-xs text-zuari-red mt-1">{form.formState.errors.name.message}</p>}
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Email *</label>
            <input {...form.register("email")} className="w-full h-9 px-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="alice.smith@company.com" />
            {form.formState.errors.email && <p className="text-xs text-zuari-red mt-1">{form.formState.errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Role *</label>
            <select {...form.register("role")} className="w-full h-9 px-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white">
              <option value="MANAGER">Manager</option>
              <option value="HR">HR</option>
              <option value="ADMIN">Admin</option>
            </select>
            {form.formState.errors.role && <p className="text-xs text-zuari-red mt-1">{form.formState.errors.role.message}</p>}
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Designation</label>
            <input {...form.register("designation")} className="w-full h-9 px-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="e.g. Senior Director" />
            {form.formState.errors.designation && <p className="text-xs text-zuari-red mt-1">{form.formState.errors.designation.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Department</label>
            <input {...form.register("department")} className="w-full h-9 px-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="e.g. Product" />
            {form.formState.errors.department && <p className="text-xs text-zuari-red mt-1">{form.formState.errors.department.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Location</label>
            <input {...form.register("location")} className="w-full h-9 px-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="e.g. London" />
            {form.formState.errors.location && <p className="text-xs text-zuari-red mt-1">{form.formState.errors.location.message}</p>}
          </div>

          {isEdit && (
            <div className="space-y-1">
              <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Status</label>
              <select value={isActive ? "1" : "0"} onChange={(e) => setIsActive(e.target.value === "1")} className="w-full h-9 px-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white">
                <option value="1">Active</option>
                <option value="0">Suspended (cannot sign in)</option>
              </select>
            </div>
          )}

          <DialogFooter className="bg-transparent border-t-0 p-0 sm:justify-end gap-2 mt-8">
            <Button type="button" variant="outline" onClick={() => (isEdit ? onClose?.() : setOpen(false))} disabled={isSubmitting} className="border-slate-200 text-slate-700 font-medium px-6 h-9">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-zuari-blue hover:bg-zuari-blue/90 text-white font-medium px-6 h-11">
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add System User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
