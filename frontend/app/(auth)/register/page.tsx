"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";
import {
  MessageSquare,
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface RegisterFormInputs {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerAuth, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormInputs>({
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = watch("password", "");

  const onSubmit = async (data: RegisterFormInputs) => {
    const success = await registerAuth(
      data.fullName,
      data.email,
      data.password
    );
    if (success) {
      router.push("/chat");
    }
  };

  return (
    <div className="w-full bg-[#1B202D] rounded-3xl p-8 sm:p-9 border border-[#2F374A] shadow-card backdrop-blur-xl">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-[#5B8EFF] flex items-center justify-center shadow-glow mb-4">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1.5">
          Create an Account
        </h1>
        <p className="text-text-secondary text-sm">
          Sign up to get started with CM Chat.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name Field */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <UserIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="e.g. Kashif Ahmed"
              {...register("fullName", {
                required: "Full name is required",
                minLength: {
                  value: 2,
                  message: "Name must be at least 2 characters",
                },
              })}
              className={`w-full pl-10 pr-4 py-3 bg-[#232A3B] border ${
                errors.fullName ? "border-accent-red" : "border-[#2F374A]"
              } rounded-xl text-white placeholder-text-muted focus:outline-none focus:border-primary transition-all text-sm`}
            />
          </div>
          {errors.fullName && (
            <p className="mt-1 text-xs text-accent-red">
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              placeholder="name@example.com"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Please enter a valid email",
                },
              })}
              className={`w-full pl-10 pr-4 py-3 bg-[#232A3B] border ${
                errors.email ? "border-accent-red" : "border-[#2F374A]"
              } rounded-xl text-white placeholder-text-muted focus:outline-none focus:border-primary transition-all text-sm`}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-accent-red">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="At least 6 characters"
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              })}
              className={`w-full pl-10 pr-10 py-3 bg-[#232A3B] border ${
                errors.password ? "border-accent-red" : "border-[#2F374A]"
              } rounded-xl text-white placeholder-text-muted focus:outline-none focus:border-primary transition-all text-sm`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-accent-red">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter password"
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (value) =>
                  value === passwordValue || "Passwords do not match",
              })}
              className={`w-full pl-10 pr-10 py-3 bg-[#232A3B] border ${
                errors.confirmPassword ? "border-accent-red" : "border-[#2F374A]"
              } rounded-xl text-white placeholder-text-muted focus:outline-none focus:border-primary transition-all text-sm`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-white transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-accent-red">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-dark text-white font-medium text-sm flex items-center justify-center gap-2 shadow-glow transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed group"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <span>Sign Up</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Login link */}
      <div className="mt-6 pt-5 border-t border-[#2F374A] text-center">
        <p className="text-xs text-text-secondary">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary-hover font-semibold hover:underline ml-1"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
