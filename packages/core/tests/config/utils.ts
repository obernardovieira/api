import { SinonSpy, SinonStub } from 'sinon';

export async function waitForStubCall(
    stub: SinonStub<any, any> | SinonSpy<any, any>,
    callNumber: number
) {
    return new Promise((resolve) => {
        const validationInterval = setInterval(() => {
            if (stub.callCount >= callNumber) {
                resolve('');
                clearInterval(validationInterval);
            }
        }, 1000);
    });
}

export function randomTx() {
    var result: string[] = [];
    var characters = 'ABCDEFabcdef0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < 64; i++) {
        result.push(
            characters.charAt(Math.floor(Math.random() * charactersLength))
        );
    }
    return '0x' + result.join('');
}

export function jumpToTomorrowMidnight() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 1);
    return tomorrow;
}