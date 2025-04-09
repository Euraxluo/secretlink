import * as React from 'react'
import { FaCheckCircle } from 'react-icons/fa'

export interface ProgressStatus {
    step: number
    message: string
}

interface ProgressIndicatorProps {
    progress: ProgressStatus
    totalSteps: number
}

function ProgressIndicator({progress, totalSteps}: ProgressIndicatorProps) {
    const percentage = (progress.step / totalSteps) * 100
    const isComplete = percentage === 100

    return (
        <div className="mt-4 space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                    className={`h-2.5 rounded-full transition-all duration-300 ease-in-out ${
                        isComplete ? 'bg-green-600' : 'bg-blue-600'
                    }`}
                    style={{width: `${percentage}%`}}
                ></div>
            </div>
            <div
                className={`border-l-4 p-4 rounded ${
                    isComplete
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'bg-blue-100 border-blue-500 text-blue-700'
                }`}
                role="alert"
            >
                <div className="flex items-center">
                    {isComplete ? (
                        <FaCheckCircle className="h-5 w-5 mr-3 text-green-500"/>
                    ) : (
                        <svg
                            className="animate-spin h-5 w-5 mr-3 text-blue-500"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            ></circle>
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                        </svg>
                    )}
                    <p className="font-bold">
                        {isComplete ? 'Complete' : `Step ${progress.step} of ${totalSteps}`}
                    </p>
                </div>
                <p className="text-sm">{progress.message}</p>
            </div>
        </div>
    )
}

export default ProgressIndicator 