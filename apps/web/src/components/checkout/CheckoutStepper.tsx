"use client";

interface CheckoutStepperProps {
  currentStep: number;
  steps: string[];
}

export function CheckoutStepper({ currentStep, steps }: CheckoutStepperProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <div key={index} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-semibold text-sm md:text-base transition-all duration-200 ${
                    isCompleted
                      ? "bg-primary-turquoise text-white"
                      : isActive
                      ? "bg-primary-turquoise text-white ring-4 ring-primary-turquoise/20"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      className="w-5 h-5 md:w-6 md:h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </div>
                {/* Step Label */}
                <span
                  className={`mt-2 text-xs md:text-sm font-medium text-center hidden sm:block ${
                    isActive
                      ? "text-primary-turquoise"
                      : isCompleted
                      ? "text-gray-600"
                      : "text-gray-400"
                  }`}
                >
                  {step}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 md:h-1 flex-1 mx-2 md:mx-4 transition-all duration-200 ${
                    isCompleted
                      ? "bg-primary-turquoise"
                      : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Step Label */}
      <div className="sm:hidden mt-4 text-center">
        <span className="text-sm font-medium text-primary-turquoise">
          {steps[currentStep - 1]}
        </span>
      </div>
    </div>
  );
}
