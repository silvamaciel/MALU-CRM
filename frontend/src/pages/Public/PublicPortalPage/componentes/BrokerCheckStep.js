import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { checkBrokerApi } from '../../../../api/publicApi';

function BrokerCheckStep({ companyId, onBrokerFound, onBrokerNotFound }) {
    const [identifier, setIdentifier] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCheck = async (e) => {
        e.preventDefault();
        if (!identifier.trim()) {
            toast.warn("Por favor, preencha o campo de identificação.");
            return;
        }
        setIsLoading(true);
        try {
            const result = await checkBrokerApi(identifier, companyId);
            if (result.exists) {
                toast.success(`Bem-vindo(a) de volta, ${result.broker.nome}!`);
                onBrokerFound(result.broker);
            } else {
                onBrokerNotFound(identifier);
            }
        } catch (error) {
            toast.error(error.error || "Falha ao verificar o corretor.");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleCheck} className="submission-form">
            <h2>Identificação do Parceiro</h2>
            <p>Para começar, por favor, identifique-se com o seu CPF ou CNPJ</p>
            <div className="form-group">
                <input 
                    type="text" 
                    placeholder="Digite o seu CPF ou CNPJ" 
                    value={identifier} 
                    onChange={(e) => setIdentifier(e.target.value)} 
                    required 
                />
            </div>
            <button type="submit" className="button submit-button-public" disabled={isLoading}>
                {isLoading ? 'Verificando...' : 'Verificar'}
            </button>
        </form>
    );
}

export default BrokerCheckStep;