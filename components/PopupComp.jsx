"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// This component imported shadcn's Dialog and then rendered a plain
// `<div style={{ border: "1px solid black" }}>` instead: an inline box, not a
// modal. No overlay, no focus trap, no Escape to close, and nothing announcing
// it to a screen reader. It now uses the Dialog it was already importing.
const PopupComp = ({ isOpen, onClose, PopupData }) => {
  if (!PopupData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{PopupData.header}</DialogTitle>
          {PopupData.description && (
            <DialogDescription>{PopupData.description}</DialogDescription>
          )}
        </DialogHeader>

        {Array.isArray(PopupData.message) && PopupData.message.length > 0 && (
          <ul className="space-y-2 text-sm text-zinc-400">
            {PopupData.message.map((message) => (
              <li key={message} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
                {message}
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button type="button" onClick={onClose} className="w-full sm:w-auto">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PopupComp;
