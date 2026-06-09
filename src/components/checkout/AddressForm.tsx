"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { notifyError } from "@/lib/notify";
import type { Address } from "@/types";

// Mirrors the server's createAddressSchema (src/app/api/addresses/route.ts).
const addressSchema = z.object({
  label: z.string().trim().min(1, "Required").max(50),
  fullName: z.string().trim().min(1, "Required").max(120),
  phone: z.string().trim().min(3, "Enter a valid phone number").max(20),
  line1: z.string().trim().min(1, "Required").max(255),
  line2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(1, "Required").max(100),
  state: z.string().trim().min(1, "Required").max(100),
  postalCode: z.string().trim().min(1, "Required").max(20),
  country: z.string().trim().length(2, "2-letter code").toUpperCase(),
  isDefault: z.boolean(),
});

export type AddressFormValues = z.infer<typeof addressSchema>;

interface AddressFormProps {
  onSuccess: (address: Address) => void;
  onCancel?: () => void;
  defaultValues?: Partial<AddressFormValues>;
  /** When set, the form UPDATES that address (PUT) instead of creating one. */
  editId?: string;
}

export function AddressForm({
  onSuccess,
  onCancel,
  defaultValues,
  editId,
}: AddressFormProps) {
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: "Home",
      fullName: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "IN",
      isDefault: false,
      ...defaultValues,
    },
  });

  async function onSubmit(values: AddressFormValues) {
    try {
      const res = await fetch(
        editId ? `/api/addresses/${editId}` : "/api/addresses",
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(values),
        }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Couldn't save address", json?.error);
        return;
      }
      onSuccess(json.data as Address);
    } catch {
      notifyError("Couldn't save address", "Please try again.");
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Label</FormLabel>
                <FormControl>
                  <Input placeholder="Home / Office" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input maxLength={2} placeholder="IN" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="+91 98765 43210" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="line1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address line 1</FormLabel>
              <FormControl>
                <Input placeholder="Flat / House no., Building, Street" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="line2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address line 2 (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Area, Landmark" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="Mumbai" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input placeholder="Maharashtra" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="postalCode"
          render={({ field }) => (
            <FormItem className="max-w-[12rem]">
              <FormLabel>Postal code</FormLabel>
              <FormControl>
                <Input inputMode="numeric" placeholder="400001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <FormLabel className="font-normal">
                  Set as default address
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <div className="mt-2 flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {editId ? "Update address" : "Save address"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
