import type { ButtonComponent } from "@backbone/design-system-contract"

export const Button: ButtonComponent = ({
  children,
  className,
  disabled,
  loading = false,
  type = "button",
  variant = "primary",
  ...props
}) => {
  const classes = [
    "ds-button",
    `ds-button--${variant}`,
    loading ? "ds-button--loading" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <button className={classes} disabled={disabled || loading} type={type} {...props}>
      {children}
    </button>
  )
}
