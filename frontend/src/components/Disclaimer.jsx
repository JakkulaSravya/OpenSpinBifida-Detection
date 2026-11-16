import { AlertTriangle } from 'lucide-react';

export default function Disclaimer() {
    return (
        <div className="disclaimer-banner">
            <AlertTriangle size={14} />
            <span>
                <strong>Disclaimer:</strong> This ML-based tool is for research and clinical decision-support only and is not a substitute for professional medical diagnosis or treatment.
            </span>
        </div>
    );
}
