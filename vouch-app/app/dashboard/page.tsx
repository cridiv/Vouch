"use client";

import React from "react";
import Navbar from "../components/Navbar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from "@/components/ui/button-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LogOut, User } from "lucide-react";

const page = () => {
  return (
    <div>
      {/* <Navbar /> */}
      <nav className="w-full sticky top-0 z-50 backdrop-blur-md font-syne border-b border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-50">
          {/* Grid Layout: 2 columns  */}
          <div className="grid grid-cols-2 h-20 items-center text-sm">
            {/* Left: Brand */}
            <div className="flex items-center gap-4 justify-start">
              <Link
                href="/"
                className="font-bold text-xl tracking-tight text-white z-50"
              >
                {`{`} vouch{` }`}
                <span className="text-[#58a0b4] text-3xl">.</span>sdk
              </Link>
            </div>

            {/* Right: Navigation Links */}
            <div className="flex items-center justify-end gap-5 font-dm-sans text-gray-600 font-medium">
              <ButtonGroup>
                <ButtonGroup>
                  <Button
                    className="text-white"
                    variant="outline"
                    size="icon-lg"
                  >
                    <User />
                  </Button>
                </ButtonGroup>

                <ButtonGroup>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon-lg">
                        <LogOut />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="font-dm-sans">
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Do you want to log out?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          You will be logged out of your account.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive">
                          Continue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </ButtonGroup>
              </ButtonGroup>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default page;
